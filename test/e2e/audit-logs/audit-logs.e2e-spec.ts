import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';
import { waitForAuditLogEntry } from '../../helpers/audit-poll';

describe('Audit Logs (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const adminUser = {
    email: `admin-audit-${Date.now()}@example.com`,
    userName: `admin-audit-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Admin',
    lastName: 'Auditor',
  };

  const regularUser = {
    email: `user-audit-${Date.now()}@example.com`,
    userName: `user-audit-${Date.now()}`,
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

  // Setup: seed admin user with ADMIN role (public register creates USER only)
  beforeAll(async () => {
    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    // Register regular user
    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send(regularUser)
      .expect(201);

    // Verify regular user email
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

  describe('GET /admin/audit-logs', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .expect(401);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 200 with paginated results for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should support filtering by action', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?action=auth.register')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // All returned entries should match the filter
      for (const entry of response.body.data) {
        expect(entry.action).toBe('auth.register');
      }
    });

    it('should support filtering by resource', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?resource=auth')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      for (const entry of response.body.data) {
        expect(entry.resource).toBe('auth');
      }
    });

    it('should support pagination parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Audit log creation via HTTP requests', () => {
    it('should create audit log entry when user registers', async () => {
      const newUser = {
        email: `audit-test-${Date.now()}@example.com`,
        userName: `audit-test-${Date.now()}`,
        password: 'TestW0rd!x97',
        name: 'Audit',
        lastName: 'Test',
      };

      // Register a new user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(newUser)
        .expect(201);

      // Wait (bounded poll) for async audit persistence
      await waitForAuditLogEntry(app, adminToken, { action: 'auth.register', resource: 'auth' });
    });

    it('should create audit log entry when user logs in', async () => {
      // Login
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: regularUser.email, password: regularUser.password })
        .expect(200);

      // Wait (bounded poll) for async audit persistence
      await waitForAuditLogEntry(app, adminToken, { action: 'auth.login', resource: 'auth' });
    });
  });
});
