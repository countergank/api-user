import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    userName: `testuser-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Test',
    lastName: 'User',
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    let verificationToken: string;

    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('verificationToken');
      expect(response.body.user).toMatchObject({
        email: testUser.email,
        userName: testUser.userName,
        name: testUser.name,
        lastName: testUser.lastName,
      });

      verificationToken = response.body.verificationToken;
    });

    it('should verify email', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(201);
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      token = response.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh token with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const refreshToken = response.body.refreshToken;

      const newTokens = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(newTokens.body).toHaveProperty('accessToken');
      expect(newTokens.body).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/auth/forgot-password (POST)', () => {
    it('should request password reset', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);
    });
  });

  describe('/users/profile (GET)', () => {
    it('should get user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toMatchObject({
        email: testUser.email,
        name: testUser.name,
        lastName: testUser.lastName,
      });
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });
  });
});
