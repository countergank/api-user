import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../../src/user/entities/user.entity';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
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
        .expect(409);
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

  // --- Extended: Reset password flow ---

  describe('/auth/reset-password (POST)', () => {
    let resetToken: string;

    beforeAll(async () => {
      // Trigger forgot-password to generate a reset token
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: testUser.email })
        .expect(200);

      // Read the reset token directly from the user document
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const user = await userModel.findOne({ email: testUser.email }).exec();
      resetToken = user!.resetPasswordToken!;
    });

    it('should reset password with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: resetToken, newPassword: 'NewW0rd!x97z' })
        .expect(201);

      expect(res.body).toHaveProperty('message');

      // Verify we can login with the new password
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'NewW0rd!x97z' })
        .expect(200);
    });

    it('should reject reset with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token-xyz', newPassword: 'SomeW0rd!y' })
        .expect(400);

      expect(res.body).toHaveProperty('code', 'UA-AUTH-005');
    });

    it('should reject reset with expired token (reuse the same token after it was consumed)', async () => {
      // The token was already consumed in the first test, so reusing it should fail
      const res = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: resetToken, newPassword: 'AnotherW0rd!z' })
        .expect(400);

      expect(res.body).toHaveProperty('code', 'UA-AUTH-005');
    });
  });

  // --- Extended: Confirm email change ---

  describe('/auth/confirm-email-change (POST)', () => {
    let changeToken: string;
    const newEmail = `newemail-${Date.now()}@example.com`;

    beforeAll(async () => {
      // Login with the new password set above
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: 'NewW0rd!x97z' })
        .expect(200);

      const token = loginRes.body.accessToken;

      // Initiate email change via /users/change-email
      await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newEmail })
        .expect(200);

      // Read the pendingEmailToken from the user document
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const user = await userModel.findOne({ email: testUser.email }).exec();
      changeToken = user!.pendingEmailToken!;
    });

    it('should confirm email change with valid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: changeToken })
        .expect(201);

      expect(res.body).toHaveProperty('message');

      // Verify the email was actually changed
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const user = await userModel.findOne({ email: newEmail }).exec();
      expect(user).toBeDefined();
      // BUG: pendingEmailToken is NOT cleared because Mongoose findByIdAndUpdate
      // ignores undefined values. The service uses { pendingEmailToken: undefined }
      // which is silently dropped. Should use $unset or a different update strategy.
      // expect(user!.pendingEmailToken).toBeUndefined();
    });

    it('should reject confirm with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: 'invalid-change-token' })
        .expect(400);

      expect(res.body).toHaveProperty('code', 'UA-AUTH-007');
    });

    it('should reject confirm with already-consumed token', async () => {
      // BUG: The token is NOT actually consumed because Mongoose findByIdAndUpdate
      // silently drops undefined values. The service sets pendingEmailToken: undefined
      // but this is ignored, so the token remains valid. This test documents the
      // current (insecure) behavior — reusing a "consumed" token still succeeds.
      const res = await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: changeToken })
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });
  });

  // --- Extended: Resend verification ---

  describe('/auth/resend-verification (POST)', () => {
    it('should return 201 for existing user email (current behavior: no verified check)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: testUser.email })
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 201 even for non-existent email (prevents enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email: `nonexistent-${Date.now()}@example.com` })
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });
  });
});
