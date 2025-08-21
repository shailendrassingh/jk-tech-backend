import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({
    description: 'The title of the document.',
    example: 'Q1 Financial Report',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'A brief description of the document.',
    example: 'The quarterly financial report for the first quarter.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}