import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

describe('Cache Admin (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const regularUser = {
    email: `user-cache-${Date.now()}@example.com`,
    userName: `user-cache-${Date.now()}`,
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

  beforeAll(async () => {
    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    const userReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send(regularUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: userReg.body.verificationToken })
      .expect(200);

    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: regularUser.email, password: regularUser.password })
      .expect(200);
    userToken = userLogin.body.accessToken;
  }, 30000);

  describe('S7: Unauthenticated requests', () => {
    it('should return 401 for GET /admin/cache/stats without auth', async () => {
      await request(app.getHttpServer())
        .get('/admin/cache/stats')
        .expect(401);
    });
  });

  describe('S7: Non-admin user', () => {
    it('should return 403 for GET /admin/cache/stats with non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/cache/stats')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('S4: Admin metrics', () => {
    it('should return 200 with all five metrics for admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/cache/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          hits: expect.any(Number),
          misses: expect.any(Number),
          hitRate: expect.any(Number),
          size: expect.any(Number),
          evictions: expect.any(Number),
        }),
      );
      expect(Object.keys(res.body).sort()).toEqual(
        ['evictions', 'hitRate', 'hits', 'misses', 'size'],
      );
    });
  });
});
