import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('UserProfile (e2e)', () => {
  let app: INestApplication;
  let token: string;

  const testUser = {
    email: `profile-${Date.now()}@example.com`,
    userName: `profileuser-${Date.now()}`,
    password: 'ProfilePassword123!',
    name: 'Profile',
    lastName: 'User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(testUser)
      .expect(201);

    // Verify email
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(201);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    token = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/users/profile (GET)', () => {
    it('should get user profile', async () => {
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

    it('should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .expect(401);
    });
  });

  describe('/users/profile (PATCH)', () => {
    it('should update user profile', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'UpdatedName' })
        .expect(200);

      expect(response.body.name).toBe('UpdatedName');
    });
  });

  describe('/users/change-password (POST)', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewPassword123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject with invalid current password', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'AnotherPassword123!',
        })
        .expect(400);
    });
  });
});
