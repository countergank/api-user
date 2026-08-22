import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

describe('I18n Admin (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const regularUser = {
    email: `user-i18n-${Date.now()}@example.com`,
    userName: `user-i18n-${Date.now()}`,
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

  // --- I18N-A02: Auth required ---

  describe('I18N-A02: Auth required', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/admin/i18n/reload')
        .expect(401);
    });
  });

  // --- I18N-A01: Reload translations ---

  describe('I18N-A01: Reload translations', () => {
    it('should return 201 with success message for admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/i18n/reload')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });

    it('should return 201 with success message for non-admin user (JwtAuthGuard only, no RolesGuard)', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/i18n/reload')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(201);

      expect(res.body).toHaveProperty('message');
    });
  });
});
