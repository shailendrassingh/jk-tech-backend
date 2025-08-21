import { Controller, Post, Body, UseGuards, Get, Delete, Param, HttpCode, HttpStatus, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '@app/common';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(AuthGuard('jwt'))
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // 'file' is the field name for the uploaded file
  @ApiConsumes('multipart/form-data') // Specify content type for Swagger
  @ApiOperation({ summary: 'Upload a document and create its record' })
  @ApiResponse({ status: 201, description: 'The document has been successfully uploaded.' })
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    return this.documentsService.create(createDocumentDto, file.path, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents for the current user' })
  findAllForUser(@GetUser() user: User) {
    return this.documentsService.findAllForUser(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document and its record' })
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.documentsService.remove(id, user);
  }
}