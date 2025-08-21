import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '@app/common';
import { DocumentsModule } from '../src/documents.module';
import * as bcrypt from 'bcrypt';

describe('DocumentsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userToken: string;
  let userId: string;
  let documentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [DocumentsModule],
    }).compile();

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
        email: 'doc.user.e2e@example.com',
        password: hashedPassword,
        roles: [Role.EDITOR],
      },
    });
    userId = user.id;

    // Generate token
    userToken = jwtService.sign({ sub: user.id, email: user.email, roles: user.roles });
  });

  afterAll(async () => {
    await prisma.document.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('/documents (POST)', () => {
    it('should create a new document record', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'E2E Test Doc', filePath: 'e2e/test.pdf' })
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('E2E Test Doc');
          expect(res.body.ownerId).toBe(userId);
          documentId = res.body.id; // Save for later tests
        });
    });

    it('should fail without a valid token', () => {
      return request(app.getHttpServer())
        .post('/documents')
        .send({ title: 'E2E Test Doc', filePath: 'e2e/test.pdf' })
        .expect(401);
    });
  });

  describe('/documents (GET)', () => {
    it('should return documents for the authenticated user', () => {
      return request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBe(1);
          expect(res.body[0].id).toBe(documentId);
        });
    });
  });

  describe('/documents/:id (DELETE)', () => {
    it('should delete the document for the owner', () => {
      return request(app.getHttpServer())
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);
    });

    it('should return 404 if trying to delete a non-existent document', () => {
        return request(app.getHttpServer())
          .delete(`/documents/non-existent-id`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
    });
  });
});
