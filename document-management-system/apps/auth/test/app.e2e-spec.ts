import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from '../src/auth.module';
import { PrismaService } from '@app/common';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);

    // Use the same validation pipe as in main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }));

    await app.init();

    // Clean the database before running tests
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean the database after tests
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({name: 'John Doe', email: 'test.e2e@example.com', password: 'password123' })
        .expect(201)
        .then((response) => {
          expect(response.body).toHaveProperty('id');
          expect(response.body.email).toEqual('test.e2e@example.com');
          expect(response.body).not.toHaveProperty('password');
        });
    });

    it('should fail if the email is already taken', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({name: 'JonJohn Doe', email: 'test.e2e@example.com', password: 'password123' })
        .expect(409); // Conflict
    });

    it('should fail with an invalid email', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({name: 'JonJohn Doe', email: 'invalid-email', password: 'password123' })
          .expect(400); // Bad Request
    });

    it('should fail if password is too short', () => {
        return request(app.getHttpServer())
          .post('/auth/register')
          .send({name: 'JonJohn Doe', email: 'shortpass@example.com', password: '123' })
          .expect(400); // Bad Request
    });
  });

  describe('/auth/login (POST)', () => {
    it('should log in the user and return a JWT', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test.e2e@example.com', password: 'password123' })
        .expect(200)
        .then((response) => {
          expect(response.body).toHaveProperty('access_token');
        });
    });

    it('should fail with incorrect credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test.e2e@example.com', password: 'wrongpassword' })
        .expect(401); // Unauthorized
    });
  });
});
