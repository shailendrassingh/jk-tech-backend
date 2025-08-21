import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IngestionModule } from './ingestion.module';

async function bootstrap() {
  const app = await NestFactory.create(IngestionModule);

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // --- Swagger (OpenAPI) Documentation Setup ---
  const config = new DocumentBuilder()
    .setTitle('Ingestion Microservice')
    .setDescription('API for triggering the document ingestion and RAG pipeline.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // ---------------------------------------------

  // Set port for the ingestion service as per the architecture diagram
  await app.listen(3004);
  console.log(`Ingestion service is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation is available at http://localhost:3004/api`);
}
bootstrap();