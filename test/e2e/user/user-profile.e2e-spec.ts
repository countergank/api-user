import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';

describe('UserProfile (e2e)', () => {
  let app: INestApplication;
  let token: string;

  const testUser = {
    email: `profile-${Date.now()}@example.com`,
    userName: `profileuser-${Date.now()}`,
    password: 'Pr0fileW0rd!x',
    name: 'Profile',
    lastName: 'User',
  };

  beforeAll(async () => {
    app = await createTestApp();

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
          newPassword: 'NewW0rd!y97x',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject with invalid current password', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'Wr0ngW0rd!z',
          newPassword: 'An0th3rW0rd!a',
        })
        .expect(400);
    });
  });

  // --- Extended: Change email ---

  describe('/users/change-email (POST)', () => {
    const newEmail = `changed-${Date.now()}@example.com`;

    it('should initiate email change and return 200', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject change-email to a duplicate email', async () => {
      // Register another user to own a specific email, then try to change to it
      const otherUser = {
        email: `other-${Date.now()}@example.com`,
        userName: `otheruser-${Date.now()}`,
        password: 'Oth3rW0rd!x',
        name: 'Other',
        lastName: 'User',
      };
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(otherUser)
        .expect(201);

      // Now try to change our email to the other user's email → should be 409
      const res = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: otherUser.email })
        .expect(409);

      expect(res.body).toHaveProperty('code', 'UA-USR-004');
    });

    it('should reject change-email without authentication', async () => {
      await request(app.getHttpServer())
        .post('/users/change-email')
        .send({ email: 'some-new-email@example.com' })
        .expect(401);
    });
  });
});
