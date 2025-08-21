import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '@app/common';
import { UsersModule } from '../src/users.module';
import * as bcrypt from 'bcrypt';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let adminToken: string;
  let viewerToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    // Clean and seed the database
    await prisma.user.deleteMany({});
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin.e2e@example.com',
        password: hashedPassword,
        roles: [Role.ADMIN],
      },
    });
    adminUserId = adminUser.id;

    const viewerUser = await prisma.user.create({
      data: {
        name: 'Viewer User',
        email: 'viewer.e2e@example.com',
        password: hashedPassword,
        roles: [Role.VIEWER],
      },
    });

    // Generate tokens
    adminToken = jwtService.sign({ sub: adminUser.id, email: adminUser.email, roles: adminUser.roles });
    viewerToken = jwtService.sign({ sub: viewerUser.id, email: viewerUser.email, roles: viewerUser.roles });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('/users (POST)', () => {
    it('should be forbidden for non-admin users', () => {
        return request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ name: 'New User', email: 'new@example.com', password: 'password123' })
            .expect(403);
    });

    it('should create a new user for an admin', () => {
        return request(app.getHttpServer())
            .post('/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Created by Admin', email: 'created@example.com', password: 'password123' })
            .expect(201)
            .then((res) => {
                expect(res.body.email).toBe('created@example.com');
                expect(res.body.name).toBe('Created by Admin');
            });
    });
  });

  describe('/users (GET)', () => {
    it('should be forbidden for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });

    it('should be unauthorized for no token', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should return all users for an admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/users/:id (PATCH)', () => {
    it('should be forbidden for non-admin users', () => {
      return request(app.getHttpServer())
        .patch(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should update user name and roles for an admin', () => {
      return request(app.getHttpServer())
        .patch(`/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Admin Name', roles: [Role.EDITOR] })
        .expect(200)
        .then((res) => {
          expect(res.body.name).toBe('Updated Admin Name');
          expect(res.body.roles).toContain(Role.EDITOR);
        });
    });
  });

  describe('/users/:id (DELETE)', () => {
    it('should be forbidden for non-admin users', async () => {
        const tempUser = await prisma.user.create({data: {name: 'Temp', email: 'temp@e2e.com', password: 'pw'}});
        return request(app.getHttpServer())
            .delete(`/users/${tempUser.id}`)
            .set('Authorization', `Bearer ${viewerToken}`)
            .expect(403);
    });

    it('should delete a user for an admin', async () => {
        const tempUser = await prisma.user.create({data: {name: 'Temp2', email: 'temp2@e2e.com', password: 'pw'}});
        return request(app.getHttpServer())
            .delete(`/users/${tempUser.id}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(204);
    });
  });
});
