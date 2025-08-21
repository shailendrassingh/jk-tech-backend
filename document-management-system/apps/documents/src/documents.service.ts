import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@app/common';
import { CreateDocumentDto } from './dto/create-document.dto';
import { User } from '@prisma/client';
import * as fs from 'fs/promises';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDocumentDto: CreateDocumentDto, filePath: string, user: User) {
    return this.prisma.document.create({
      data: {
        title: createDocumentDto.title,
        description: createDocumentDto.description,
        filePath: filePath,
        ownerId: user.id,
      },
    });
  }

  async findAllForUser(user: User) {
    return this.prisma.document.findMany({ where: { ownerId: user.id } });
  }

  async findOne(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) {
      throw new NotFoundException(`Document with ID "${id}" not found.`);
    }
    return document;
  }

  async remove(id: string, user: User) {
    const document = await this.findOne(id);

    if (document.ownerId !== user.id && !user.roles.includes('ADMIN')) {
      throw new ForbiddenException('You do not have permission to delete this document.');
    }

    // Delete the file from the local disk
    try {
      await fs.unlink(document.filePath);
    } catch (error) {
      console.error(`Failed to delete file: ${document.filePath}`, error);
      // Decide if you want to throw an error or just log it
    }

    // Delete the record from the database
    await this.prisma.document.delete({ where: { id } });
  }
}