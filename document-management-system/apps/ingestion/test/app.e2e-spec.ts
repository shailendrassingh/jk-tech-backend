import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '@app/common';
import { IngestionModule } from '../src/ingestion.module';
import * as bcrypt from 'bcrypt';
import { ClientProxy } from '@nestjs/microservices';

// Mock the RabbitMQ client
class MockRagClient {
  emit() {}
  close() {}
}

describe('IngestionController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let documentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IngestionModule],
    })
    .overrideProvider('RAG_SERVICE') // Override the real RMQ client with our mock
    .useClass(MockRagClient)
    .compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // Clean and seed the database
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await prisma.user.create({
      data: {
        email: 'ingestion.user.e2e@example.com',
        password: hashedPassword,
        roles: [Role.EDITOR],
      },
    });

    const document = await prisma.document.create({
        data: {
            title: 'E2E Ingestion Doc',
            filePath: 'e2e/ingestion.pdf',
            ownerId: user.id
        }
    });
    documentId = document.id;

    // Generate token
    userToken = jwtService.sign({ sub: user.id, email: user.email, roles: user.roles });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/ingestion/trigger (POST)', () => {
    it('should trigger the ingestion process successfully', () => {
      return request(app.getHttpServer())
        .post('/ingestion/trigger')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ documentId: documentId })
        .expect(201) // Assuming default POST status, can be 200
        .then((res) => {
            expect(res.body.message).toContain('successfully triggered');
        });
    });

    it('should fail for a non-existent document', () => {
        return request(app.getHttpServer())
          .post('/ingestion/trigger')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ documentId: 'non-existent-id' })
          .expect(404);
    });

    it('should fail without a valid token', () => {
      return request(app.getHttpServer())
        .post('/ingestion/trigger')
        .send({ documentId: documentId })
        .expect(401);
    });
  });
});
