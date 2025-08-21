import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/common';
import { DocumentsService } from './documents.service';
import { Role, User } from '@prisma/client';
import * as fs from 'fs/promises';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const mockPrismaService = {
  document: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
};

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  password: 'hashedPassword',
  roles: [Role.VIEWER],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdminUser: User = {
  id: 'admin-1',
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'hashedPassword',
  roles: [Role.ADMIN],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockDocument = {
  id: 'doc-1',
  title: 'Test Document',
  filePath: 'uploads/test-file.pdf',
  ownerId: mockUser.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  description: null,
};

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a document', async () => {
      const createDto = { title: 'Test Document' };
      const mockFilePath = 'uploads/test-file.pdf';
      mockPrismaService.document.create.mockResolvedValue(mockDocument);

      // Call the method with all three required arguments
      const result = await service.create(createDto, mockFilePath, mockUser);

      expect(result).toEqual(mockDocument);
      expect(mockPrismaService.document.create).toHaveBeenCalledWith({
        data: {
          title: createDto.title,
          description: undefined,
          filePath: mockFilePath,
          ownerId: mockUser.id,
        },
      });
    });
  });

  describe('findAllForUser', () => {
    it('should return all documents for a specific user', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([mockDocument]);
      const result = await service.findAllForUser(mockUser);
      expect(result).toEqual([mockDocument]);
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockUser.id },
      });
    });
  });

  describe('remove', () => {
    it('should allow the owner to delete their document and the file', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      await service.remove(mockDocument.id, mockUser);
      
      expect(fs.unlink).toHaveBeenCalledWith(mockDocument.filePath);
      expect(mockPrismaService.document.delete).toHaveBeenCalledWith({
        where: { id: mockDocument.id },
      });
    });

    it('should allow an admin to delete any document', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);
      await service.remove(mockDocument.id, mockAdminUser);
      expect(mockPrismaService.document.delete).toHaveBeenCalledWith({
        where: { id: mockDocument.id },
      });
    });

    it('should throw ForbiddenException if a non-owner tries to delete', async () => {
      const anotherUser = { ...mockUser, id: 'user-2' };
      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      await expect(service.remove(mockDocument.id, anotherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
