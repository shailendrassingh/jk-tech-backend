import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { GetUser } from '@app/common';
import { IngestionService } from './ingestion.service';
import { IngestionDto } from './dto/ingestion.dto';

@ApiTags('ingestion')
@ApiBearerAuth()
@Controller('ingestion')
@UseGuards(AuthGuard('jwt'))
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger the ingestion process for a document' })
  @ApiResponse({ status: 200, description: 'Ingestion process has been successfully triggered.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User does not own the document.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  triggerIngestion(@Body() ingestionDto: IngestionDto, @GetUser() user: User) {
    return this.ingestionService.triggerIngestion(ingestionDto, user);
  }
}