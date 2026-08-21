import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

describe('Parameters Admin (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const adminUser = {
    email: `admin-par-${Date.now()}@example.com`,
    userName: `admin-par-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Admin',
    lastName: 'Parameters',
  };

  const regularUser = {
    email: `user-par-${Date.now()}@example.com`,
    userName: `user-par-${Date.now()}`,
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

  // --- S7: Unauthenticated ---

  describe('S7: Unauthenticated requests', () => {
    it('should return 401 for GET /admin/parameters without auth', async () => {
      await request(app.getHttpServer())
        .get('/admin/parameters')
        .expect(401);
    });

    it('should return 401 for GET /admin/parameters/:group without auth', async () => {
      await request(app.getHttpServer())
        .get('/admin/parameters/email')
        .expect(401);
    });

    it('should return 401 for PUT /admin/parameters/:key without auth', async () => {
      await request(app.getHttpServer())
        .put('/admin/parameters/THROTTLE_LIMIT')
        .send({ value: '20' })
        .expect(401);
    });
  });

  // --- S8: Non-admin forbidden ---

  describe('S8: Non-admin forbidden', () => {
    it('should return 403 for GET /admin/parameters with non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/admin/parameters')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 403 for PUT /admin/parameters/:key with non-admin user', async () => {
      await request(app.getHttpServer())
        .put('/admin/parameters/THROTTLE_LIMIT')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ value: '20' })
        .expect(403);
    });
  });

  // --- S1: List all parameters ---

  describe('S1: List all parameters', () => {
    it('should return 200 with array of parameter entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/parameters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const entry = res.body[0];
      expect(entry).toHaveProperty('key');
      expect(entry).toHaveProperty('type');
      expect(entry).toHaveProperty('value');
      expect(entry).toHaveProperty('default');
      expect(entry).toHaveProperty('group');
      expect(entry).toHaveProperty('isOverridden');
    });

    it('should include known parameter keys', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/parameters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const keys = res.body.map((p: { key: string }) => p.key);
      expect(keys).toContain('THROTTLE_LIMIT');
      expect(keys).toContain('EMAIL_FROM');
    });
  });

  // --- S2: Filter by group ---

  describe('S2: Filter by group', () => {
    it('should return 200 with filtered parameters for email group', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/parameters/email')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      res.body.forEach((entry: { group: string }) => {
        expect(entry.group).toBe('email');
      });
    });

    it('should return 200 with filtered parameters for throttle group', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/parameters/throttle')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((entry: { group: string }) => {
        expect(entry.group).toBe('throttle');
      });
    });

    // S11: Empty group
    it('should return 200 with empty array for unknown group', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/parameters/nonexistent-group')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });
  });

  // --- S3: Update parameter ---

  describe('S3: Update parameter', () => {
    it('should update a string parameter and return 200', async () => {
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/EMAIL_FROM')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'updated@test.com' })
        .expect(200);

      expect(res.body).toHaveProperty('key', 'EMAIL_FROM');
      expect(res.body).toHaveProperty('value', 'updated@test.com');
      expect(res.body).toHaveProperty('type', 'string');
    });

    it('should update a number parameter and return 200', async () => {
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/THROTTLE_LIMIT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: '25' })
        .expect(200);

      expect(res.body).toHaveProperty('key', 'THROTTLE_LIMIT');
      expect(res.body).toHaveProperty('type', 'number');
    });

    it('should update a boolean parameter and return 200', async () => {
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/EMAIL_SECURE')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'true' })
        .expect(200);

      expect(res.body).toHaveProperty('key', 'EMAIL_SECURE');
      expect(res.body).toHaveProperty('type', 'boolean');
    });
  });

  // --- S5: Unknown key 404 ---

  describe('S5: Update rejects non-existent key', () => {
    it('should return 404 with UA-PAR-001 for unknown parameter key', async () => {
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/NONEXISTENT_KEY')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'anything' })
        .expect(404);

      expect(res.body).toHaveProperty('code', 'UA-PAR-001');
      expect(res.body).toHaveProperty('statusCode', 404);
    });
  });

  // --- S6: Type mismatch 422 ---

  describe('S6: Update rejects type mismatch', () => {
    it('should return 422 with UA-PAR-003 when sending non-number for number param', async () => {
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/THROTTLE_LIMIT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'not-a-number' })
        .expect(422);

      expect(res.body).toHaveProperty('code', 'UA-PAR-003');
      expect(res.body).toHaveProperty('statusCode', 422);
    });

    it('should return 422 with UA-PAR-003 when sending invalid boolean value', async () => {
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/EMAIL_SECURE')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: 'maybe' })
        .expect(422);

      expect(res.body).toHaveProperty('code', 'UA-PAR-003');
      expect(res.body).toHaveProperty('statusCode', 422);
    });
  });

  // --- S4: Env-overridden 409 ---

  describe('S4: Update rejects env-overridden parameter', () => {
    it('should return 409 with UA-PAR-002 when parameter is overridden', async () => {
      // First set a value different from default to make isOverridden=true.
      // Then attempt to update it -- should fail with 409.
      // Note: Requires Redis running for the override to persist in storage.
      // Without Redis, L1 cache fallback may not trigger isOverridden=true.
      const res = await request(app.getHttpServer())
        .put('/admin/parameters/THROTTLE_LIMIT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: '99' })
        .expect(200);

      // Now the parameter is overridden (value 99 != default 10).
      // Next update should be rejected with 409.
      const res2 = await request(app.getHttpServer())
        .put('/admin/parameters/THROTTLE_LIMIT')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: '50' })
        .expect(409);

      expect(res2.body).toHaveProperty('code', 'UA-PAR-002');
      expect(res2.body).toHaveProperty('statusCode', 409);
    });
  });
});
