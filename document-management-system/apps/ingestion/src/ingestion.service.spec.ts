import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '@app/common';
import { IngestionService } from './ingestion.service';
import { Role, User } from '@prisma/client';

const mockPrismaService = {
  document: {
    findUnique: jest.fn(),
  },
};

const mockRagClient = {
  emit: jest.fn(),
  close: jest.fn(),
};

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'pw',
  roles: [Role.VIEWER],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDocument = {
  id: 'doc-1',
  title: 'Test Doc',
  filePath: 'docs/test.pdf',
  ownerId: mockUser.id,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('IngestionService', () => {
  let service: IngestionService;
  let ragClient: ClientProxy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'RAG_SERVICE', useValue: mockRagClient },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    ragClient = module.get<ClientProxy>('RAG_SERVICE');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerIngestion', () => {
    const ingestionDto = { documentId: mockDocument.id };

    it('should successfully trigger ingestion and emit an event', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      const result = await service.triggerIngestion(ingestionDto, mockUser);

      expect(mockPrismaService.document.findUnique).toHaveBeenCalledWith({ where: { id: mockDocument.id } });
      expect(ragClient.emit).toHaveBeenCalledWith('document_ingestion_triggered', {
        documentId: mockDocument.id,
        filePath: mockDocument.filePath,
      });
      expect(result).toEqual({ message: `Document ingestion for "${mockDocument.title}" has been successfully triggered.` });
    });

    it('should throw NotFoundException if document does not exist', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);
      await expect(service.triggerIngestion(ingestionDto, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the document', async () => {
      const anotherUser = { ...mockUser, id: 'user-2' };
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      await expect(service.triggerIngestion(ingestionDto, anotherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
