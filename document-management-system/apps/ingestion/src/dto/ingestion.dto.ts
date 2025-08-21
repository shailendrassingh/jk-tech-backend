import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class IngestionDto {
  @ApiProperty({
    description: 'The ID of the document to be ingested.',
    example: 'clx123abc456def789',
  })
  @IsString()
  @IsNotEmpty()
  documentId: string;
}