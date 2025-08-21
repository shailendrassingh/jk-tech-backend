import os
import json
import time
import pika
import psycopg2
import threading
from psycopg2.extras import execute_values
from pgvector.psycopg2 import register_vector
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from docx import Document as DocxDocument
from pypdf import PdfReader
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# --- 1. INITIALIZATION AND CONFIGURATION ---

print("Starting RAG service...")

# Load environment variables from .env file
load_dotenv()

# Load configuration from environment
RABBITMQ_URI = os.getenv("RABBITMQ_URI")
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_NAME = 'all-MiniLM-L6-v2' # A good starting model

# Load the sentence transformer model
print(f"Loading sentence transformer model: {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME)
print("Model loaded successfully.")

# --- 2. API SETUP (FastAPI) ---

app = FastAPI()

class QARequest(BaseModel):
    question: str
    document_ids: list[str] = [] # Optional: to scope search to specific documents

# --- 3. HELPER AND CORE RAG FUNCTIONS ---

def get_db_connection():
    """Establishes and returns a connection to the PostgreSQL database."""
    conn = psycopg2.connect(DATABASE_URL)
    register_vector(conn)
    return conn

def extract_text_from_pdf(file_path):
    """Extracts text from a PDF file."""
    print(f"Extracting text from PDF: {file_path}")
    with open(file_path, 'rb') as f:
        reader = PdfReader(f)
        text = "".join(page.extract_text() for page in reader.pages)
    return text

def extract_text_from_docx(file_path):
    """Extracts text from a DOCX file."""
    print(f"Extracting text from DOCX: {file_path}")
    doc = DocxDocument(file_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

def chunk_text(text, chunk_size=500, overlap=50):
    """Splits text into overlapping chunks."""
    print(f"Chunking text into chunks of size {chunk_size}...")
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunks.append(" ".join(words[i:i + chunk_size]))
    print(f"Generated {len(chunks)} chunks.")
    return chunks

def find_similar_chunks(question_embedding, document_ids, limit=5):
    """Finds the most relevant document chunks from the database."""
    print("Finding similar chunks in the database...")
    conn = get_db_connection()
    with conn.cursor() as cur:
        # The <-> operator performs cosine distance search with pgvector
        if document_ids:
            # Scope the search to specific document IDs
            cur.execute(
                "SELECT chunk_text FROM document_chunks WHERE document_id = ANY(%s) ORDER BY embedding <-> %s LIMIT %s",
                (document_ids, question_embedding, limit)
            )
        else:
            # Search across all documents
            cur.execute(
                "SELECT chunk_text FROM document_chunks ORDER BY embedding <-> %s LIMIT %s",
                (question_embedding, limit)
            )
        results = [row[0] for row in cur.fetchall()]
    conn.close()
    print(f"Found {len(results)} relevant chunks.")
    return results

def generate_answer(question, context_chunks):
    """
    (Simulated LLM) Generates an answer based on the question and context.
    In a real application, this would call an external LLM API (like OpenAI).
    """
    print("Generating final answer...")
    if not context_chunks:
        return "I'm sorry, I couldn't find any relevant information in the provided documents to answer your question."

    # Create a prompt for the LLM
    context = "\n\n".join(context_chunks)
    prompt = f"""
    Based on the following context, please answer the question.

    Context:
    ---
    {context}
    ---

    Question: {question}

    Answer:
    """
    
    # --- LLM Call Simulation ---
    # For this POC, we'll just return the prompt and a simple formatted answer.
    # In a real app: response = openai.Completion.create(prompt=prompt, ...)
    print(f"--- Generated Prompt for LLM ---\n{prompt}")
    simulated_answer = f"Based on the provided documents, here is the information related to your question about '{question}':\n\n- " + "\n- ".join(context_chunks)
    return simulated_answer

# --- 4. API ENDPOINTS ---

@app.post("/qa")
def answer_question(request: QARequest):
    """
    Handles a Q&A request by finding relevant context and generating an answer.
    """
    print(f"\n[+] Received Q&A request: '{request.question}'")
    try:
        # 1. Generate embedding for the user's question
        question_embedding = model.encode(request.question)
        
        # 2. Retrieve relevant chunks from the database
        context_chunks = find_similar_chunks(question_embedding, request.document_ids)
        
        # 3. Generate a final answer
        answer = generate_answer(request.question, context_chunks)
        
        return {"answer": answer}

    except Exception as e:
        print(f"[!] Error during Q&A: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while processing your question.")


# --- 5. RABBITMQ CONSUMER ---

def process_document(channel, method, properties, body):
    """Callback function to process a message from the RabbitMQ queue."""
    try:
        print("\n[+] Received new message. Processing document...")
        message = json.loads(body)
        document_id = message.get('documentId')
        file_path = message.get('s3Key') # Local file path in our setup

        if not document_id or not file_path:
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        full_file_path = os.path.join('uploads', os.path.basename(file_path))
        print(f"Document ID: {document_id}, File Path: {full_file_path}")

        if not os.path.exists(full_file_path):
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        _, extension = os.path.splitext(full_file_path)
        text = ""
        if extension.lower() == '.pdf':
            text = extract_text_from_pdf(full_file_path)
        elif extension.lower() == '.docx':
            text = extract_text_from_docx(full_file_path)
        else:
            channel.basic_ack(delivery_tag=method.delivery_tag)
            return

        chunks = chunk_text(text)
        embeddings = model.encode(chunks)

        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("DELETE FROM document_chunks WHERE document_id = %s", (document_id,))
            data_to_insert = [(document_id, chunk, embedding) for chunk, embedding in zip(chunks, embeddings)]
            execute_values(cur, "INSERT INTO document_chunks (document_id, chunk_text, embedding) VALUES %s", data_to_insert)
            conn.commit()
        conn.close()
        
        channel.basic_ack(delivery_tag=method.delivery_tag)
        print("[✔] Document processing complete.")

    except Exception as e:
        print(f"[!] An error occurred: {e}")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def start_rabbitmq_consumer():
    """Connects to RabbitMQ and starts consuming messages in a blocking loop."""
    print("Connecting to RabbitMQ for ingestion...")
    connection = None
    while not connection:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URI))
        except pika.exceptions.AMQPConnectionError:
            print("RabbitMQ connection failed. Retrying in 5 seconds...")
            time.sleep(5)

    channel = connection.channel()
    queue_name = 'document_ingestion_queue'
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=queue_name, on_message_callback=process_document)
    
    print(f"[*] Starting RabbitMQ consumer for queue '{queue_name}'...")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        channel.stop_consuming()
    finally:
        connection.close()

# --- 6. MAIN EXECUTION BLOCK ---

if __name__ == '__main__':
    # Run the RabbitMQ consumer in a background thread
    consumer_thread = threading.Thread(target=start_rabbitmq_consumer, daemon=True)
    consumer_thread.start()

    # Start the FastAPI server in the main thread
    print("[*] Starting FastAPI server on http://localhost:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
