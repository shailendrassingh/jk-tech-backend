import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  // Enable CORS for frontend interaction
  app.enableCors();

  // Use a global pipe to enforce validation rules on all incoming requests
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips properties that do not have any decorators
    forbidNonWhitelisted: true, // Throws an error if non-whitelisted values are provided
    transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
  }));

  // --- Swagger (OpenAPI) Documentation Setup ---
  const config = new DocumentBuilder()
    .setTitle('Auth Microservice')
    .setDescription('API for user authentication and registration.')
    .setVersion('1.0')
    .addTag('auth')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  // ---------------------------------------------

  // Start the application on port 3001 as per the architecture diagram
  await app.listen(3001);
  console.log(`Auth service is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation is available at http://localhost:3001/api`);
}
bootstrap();