import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

describe('Email (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const regularUser = {
    email: `user-email-${Date.now()}@example.com`,
    userName: `user-email-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Regular',
    lastName: 'User',
  };

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);

  // Setup: seed admin + regular user
  beforeAll(async () => {
    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    // Register regular user
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send(regularUser)
      .expect(201);

    // Verify email
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: userReg.body.verificationToken })
      .expect(201);

    // Login regular user
    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: regularUser.email, password: regularUser.password })
      .expect(200);
    userToken = userLogin.body.accessToken;
  });

  // ── EM-04: Auth guards ──

  describe('EM-04: Admin auth required', () => {
    it('should return 401 without authentication — POST /email/send', async () => {
      await request(app.getHttpServer())
        .post('/email/send')
        .send({ useCase: 'welcome', to: 'test@example.com' })
        .expect(401);
    });

    it('should return 401 without authentication — POST /email/send-direct', async () => {
      await request(app.getHttpServer())
        .post('/email/send-direct')
        .send({ to: 'test@example.com', subject: 'Hi', html: '<p>Hi</p>' })
        .expect(401);
    });

    it('should return 403 for non-admin user — POST /email/send', async () => {
      await request(app.getHttpServer())
        .post('/email/send')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ useCase: 'welcome', to: 'test@example.com' })
        .expect(403);
    });

    it('should return 403 for non-admin user — POST /email/send-direct', async () => {
      await request(app.getHttpServer())
        .post('/email/send-direct')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ to: 'test@example.com', subject: 'Hi', html: '<p>Hi</p>' })
        .expect(403);
    });
  });

  // ── EM-01: Send email via template ──

  describe('EM-01: Send email via template', () => {
    it('should return 201 with queued status (fire-and-forget)', async () => {
      const res = await request(app.getHttpServer())
        .post('/email/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          useCase: 'welcome',
          to: 'recipient@example.com',
          variables: { userName: 'Test User' },
        })
        .expect(201);

      expect(res.body).toEqual({ status: 'queued' });
    });

    it('should return 404 when template slug does not exist', async () => {
      const res = await request(app.getHttpServer())
        .post('/email/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          useCase: 'nonexistent-template-slug',
          to: 'recipient@example.com',
        })
        .expect(404);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toBe('UA-EML-002');
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/email/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });

  // ── EM-02: Send direct email ──

  describe('EM-02: Send direct email', () => {
    it('should return 201 with queued status (fire-and-forget)', async () => {
      const res = await request(app.getHttpServer())
        .post('/email/send-direct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          to: 'recipient@example.com',
          subject: 'Direct Test',
          html: '<p>Direct email body</p>',
        })
        .expect(201);

      expect(res.body).toEqual({ status: 'queued' });
    });

    it('should accept optional from and replyTo fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/email/send-direct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          to: 'recipient@example.com',
          subject: 'Direct Test',
          html: '<p>Direct email body</p>',
          from: 'custom@example.com',
          replyTo: 'reply@example.com',
        })
        .expect(201);

      expect(res.body).toEqual({ status: 'queued' });
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/email/send-direct')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });
  });
});
