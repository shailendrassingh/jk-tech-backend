import { Injectable, Inject, NotFoundException, ForbiddenException, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@app/common';
import { IngestionDto } from './dto/ingestion.dto';
import { User } from '@prisma/client';

@Injectable()
export class IngestionService implements OnModuleDestroy {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('RAG_SERVICE') private readonly ragClient: ClientProxy,
  ) {}

  async onModuleDestroy() {
    // Gracefully close the connection to RabbitMQ when the app shuts down
    await this.ragClient.close();
  }

  /**
   * Triggers the document ingestion process.
   * 1. Validates that the document exists.
   * 2. Verifies that the requesting user owns the document.
   * 3. Emits an event to the RabbitMQ queue for the Python service to process.
   * @param ingestionDto Contains the documentId.
   * @param user The authenticated user making the request.
   */
  async triggerIngestion(ingestionDto: IngestionDto, user: User) {
    const { documentId } = ingestionDto;

    // 1. Find the document metadata in the database
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID "${documentId}" not found.`);
    }

    // 2. Authorization Check: Ensure the user owns the document
    if (document.ownerId !== user.id) {
      throw new ForbiddenException('You do not have permission to ingest this document.');
    }

    // 3. Emit the event to the RabbitMQ queue
    // The payload contains the filePath, which the Python service needs to fetch the file.
    this.ragClient.emit('document_ingestion_triggered', {
      documentId: document.id,
      filePath: document.filePath,
    });

    return { message: `Document ingestion for "${document.title}" has been successfully triggered.` };
  }
}
