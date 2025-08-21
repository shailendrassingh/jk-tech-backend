import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { DocumentsModule } from './documents.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(DocumentsModule);

  // Serve static files from the 'uploads' directory
  app.useStaticAssets(join(__dirname, '..', '..', '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // --- Swagger (OpenAPI) Documentation Setup ---
  const config = new DocumentBuilder()
    .setTitle('Documents Microservice')
    .setDescription('API for managing document metadata.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // ---------------------------------------------

  // Set port for the documents service as per the architecture diagram
  await app.listen(3003);
  console.log(`Documents service is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation is available at http://localhost:3003/api`);
}
bootstrap();
