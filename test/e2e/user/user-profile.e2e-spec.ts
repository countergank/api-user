import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { clearEmailChangeCodeThrottle, requestEmailChangeCode } from '../../helpers/email-change-code';

describe('UserProfile (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let preChangeToken: string;
  let loginSessionId: string;

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
      .expect(200);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    token = loginRes.body.accessToken;
    loginSessionId = loginRes.body.sessionId;
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
    it('should reject with invalid current password before any change', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'Wr0ngW0rd!z',
          newPassword: 'An0th3rW0rd!a',
        })
        .expect(400);
    });

    it('should change password with valid current password and rotate the acting session (S7)', async () => {
      // S6 evidence: this is the pre-change access token, killed by the epoch bump.
      preChangeToken = token;

      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testUser.password,
          newPassword: 'NewW0rd!y97x',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      // S7: fresh tokens for the SAME acting session, not a new login.
      expect(response.body.sessionId).toBe(loginSessionId);
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');
      expect(response.body.accessToken).not.toBe(preChangeToken);

      token = response.body.accessToken;
    });

    it('should invalidate the pre-change access token at once (S6)', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${preChangeToken}`)
        .expect(401);
    });
  });

  // --- Extended: Change email ---

  describe('/users/change-email (POST)', () => {
    const newEmail = `changed-${Date.now()}@example.com`;

    it('should reject the change without the identity proof code (S1)', async () => {
      await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newEmail })
        .expect(400);
    });

    it('should initiate email change with the code sent to the current address and return 200', async () => {
      const code = await requestEmailChangeCode(app, token);

      const response = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: newEmail, code })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(JSON.stringify(response.body)).not.toContain(code);
    });

    it('should reject change-email to the current email with 400 (S7)', async () => {
      await clearEmailChangeCodeThrottle(app, testUser.email);
      const code = await requestEmailChangeCode(app, token);

      await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: testUser.email, code })
        .expect(400);
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
      await clearEmailChangeCodeThrottle(app, testUser.email);
      const code = await requestEmailChangeCode(app, token);

      const res = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: otherUser.email, code })
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
