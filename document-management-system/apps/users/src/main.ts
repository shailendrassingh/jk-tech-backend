import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UsersModule } from './users.module';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // --- Swagger (OpenAPI) Documentation Setup ---
  const config = new DocumentBuilder()
    .setTitle('Users Microservice')
    .setDescription('API for managing users and roles.')
    .setVersion('1.0')
    .addBearerAuth() // Add support for Bearer token authentication
    .build();
  const document = SwaggerModule.createDocument(app, config);
  // The '/api' path is where the interactive documentation will be available
  SwaggerModule.setup('api', app, document);
  // ---------------------------------------------

  // Set port for the users service
  await app.listen(3002);
  console.log(`Users service is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation is available at http://localhost:3002/api`);
}
bootstrap();
