-- Drop table if it exists to start fresh
DROP TABLE IF EXISTS document_chunks;

-- Create the table to store document chunks and their embeddings
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id VARCHAR(255) NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding VECTOR(384), -- The dimension (384) depends on the embedding model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for efficient similarity searches
CREATE INDEX ON document_chunks USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);