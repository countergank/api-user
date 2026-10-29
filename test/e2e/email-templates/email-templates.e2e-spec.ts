import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

describe('Email Templates (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  const createdSlugs: string[] = [];

  const adminUser = {
    email: `admin-et-${Date.now()}@example.com`,
    userName: `admin-et-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Admin',
    lastName: 'Templates',
  };

  const regularUser = {
    email: `user-et-${Date.now()}@example.com`,
    userName: `user-et-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Regular',
    lastName: 'User',
  };

  function makeSlug(prefix = 'e2e'): string {
    const slug = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    createdSlugs.push(slug);
    return slug;
  }

  function templateBody(overrides?: Record<string, unknown>) {
    return {
      name: 'E2E Test Template',
      slug: makeSlug(),
      subject: 'Test Subject {{userName}}',
      content: '<p>Hello {{userName}}</p>',
      variables: ['userName'],
      ...overrides,
    };
  }

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    // Teardown: delete created templates to avoid cross-suite leakage
    if (app) {
      for (const slug of createdSlugs) {
        try {
          await request(app.getHttpServer())
            .delete(`/email/templates/${slug}`)
            .set('Authorization', `Bearer ${adminToken}`);
        } catch {
          // ignore cleanup failures
        }
      }
      await app.close();
    }
  }, 10000);

  // Setup: seed admin + regular user
  beforeAll(async () => {
    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    // Register regular user
    const userReg = await request(app.getHttpServer()).post('/auth/register').send(regularUser).expect(201);

    // Verify email
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: userReg.body.verificationToken })
      .expect(200);

    // Login regular user
    const userLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: regularUser.email, password: regularUser.password })
      .expect(200);
    userToken = userLogin.body.accessToken;
  });

  // ── ET-06: Auth guards ──

  describe('ET-06: Admin auth required', () => {
    it('should return 401 without authentication — POST', async () => {
      await request(app.getHttpServer()).post('/email/templates').send(templateBody()).expect(401);
    });

    it('should return 401 without authentication — GET', async () => {
      await request(app.getHttpServer()).get('/email/templates').expect(401);
    });

    it('should return 401 without authentication — GET :slug', async () => {
      await request(app.getHttpServer()).get('/email/templates/nonexistent').expect(401);
    });

    it('should return 401 without authentication — PATCH', async () => {
      await request(app.getHttpServer()).patch('/email/templates/nonexistent').send({ subject: 'x' }).expect(401);
    });

    it('should return 401 without authentication — DELETE', async () => {
      await request(app.getHttpServer()).delete('/email/templates/nonexistent').expect(401);
    });

    it('should return 403 for non-admin user — POST', async () => {
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .send(templateBody())
        .expect(403);
    });

    it('should return 403 for non-admin user — GET', async () => {
      await request(app.getHttpServer())
        .get('/email/templates')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 403 for non-admin user — PATCH', async () => {
      await request(app.getHttpServer())
        .patch('/email/templates/nonexistent')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ subject: 'x' })
        .expect(403);
    });

    it('should return 403 for non-admin user — DELETE', async () => {
      await request(app.getHttpServer())
        .delete('/email/templates/nonexistent')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ── ET-01: Create email template ──

  describe('ET-01: Create email template', () => {
    it('should create a template and return 201', async () => {
      const body = templateBody();
      const res = await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201);

      expect(res.body).toHaveProperty('_id');
      expect(res.body.slug).toBe(body.slug);
      expect(res.body.subject).toBe(body.subject);
      expect(res.body.content).toBe(body.content);
      expect(res.body.name).toBe(body.name);
    });

    it('should return 409 for duplicate slug', async () => {
      const slug = makeSlug('dup');
      // First create
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateBody({ slug }))
        .expect(201);

      // Duplicate
      const res = await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateBody({ slug }))
        .expect(409);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toBe('UA-EML-001');
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid slug format', async () => {
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateBody({ slug: 'INVALID SLUG!' }))
        .expect(400);
    });
  });

  // ── ET-02: List email templates ──

  describe('ET-02: List email templates', () => {
    it('should return 200 with the paginated envelope of templates', async () => {
      const res = await request(app.getHttpServer())
        .get('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      // Should include seeded defaults + any created in this suite
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(res.body.total)).toBe(true);
      expect(res.body.total).toBeGreaterThanOrEqual(res.body.data.length);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(res.body.totalPages).toBe(Math.ceil(res.body.total / 20));
    });

    it('should page with limit and keep total on the whole set', async () => {
      const all = await request(app.getHttpServer())
        .get('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const firstPage = await request(app.getHttpServer())
        .get('/email/templates?limit=1')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(firstPage.body.data).toHaveLength(1);
      expect(firstPage.body.limit).toBe(1);
      expect(firstPage.body.total).toBe(all.body.total);
      expect(firstPage.body.totalPages).toBe(all.body.total);

      if (all.body.total > 1) {
        const secondPage = await request(app.getHttpServer())
          .get('/email/templates?page=2&limit=1')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(secondPage.body.data).toHaveLength(1);
        expect(secondPage.body.page).toBe(2);
        expect(secondPage.body.data[0].slug).not.toBe(firstPage.body.data[0].slug);
      }
    });

    it('should support ?active=true filter', async () => {
      const res = await request(app.getHttpServer())
        .get('/email/templates?active=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      res.body.data.forEach((template: { isActive: boolean }) => {
        expect(template.isActive).toBe(true);
      });
    });

    it('should treat ?active=false as no filter', async () => {
      // Riesgo R1-active-false-filter: antes de COU-260 `active=false` no filtraba.
      // Cambiar eso rompía consumidores, así que solo `true` filtra. El caso crea sus
      // propios templates (uno inactivo) para no depender de otros tests de la suite.
      const slug = makeSlug();
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(templateBody({ slug }))
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/email/templates/${slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200);

      const all = await request(app.getHttpServer())
        .get('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const active = await request(app.getHttpServer())
        .get('/email/templates?active=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const notActiveFilter = await request(app.getHttpServer())
        .get('/email/templates?active=false')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(all.body.total).toBeGreaterThan(active.body.total);
      expect(notActiveFilter.body.total).toBe(all.body.total);
    });
  });

  // ── ET-03: Get template by slug ──

  describe('ET-03: Get template by slug', () => {
    it('should return 200 with the template object', async () => {
      // Create a template first
      const body = templateBody();
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/email/templates/${body.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.slug).toBe(body.slug);
      expect(res.body.subject).toBe(body.subject);
    });

    it('should return 404 for unknown slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/email/templates/nonexistent-slug-xyz')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toBe('UA-EML-002');
    });
  });

  // ── ET-04: Update email template ──

  describe('ET-04: Update email template', () => {
    it('should update a template and return 200', async () => {
      const body = templateBody();
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/email/templates/${body.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subject: 'Updated Subject' })
        .expect(200);

      expect(res.body.subject).toBe('Updated Subject');
      expect(res.body.slug).toBe(body.slug);
    });

    it('should return 404 when updating non-existent template', async () => {
      const res = await request(app.getHttpServer())
        .patch('/email/templates/ghost-template-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ subject: 'New Subject' })
        .expect(404);

      expect(res.body).toHaveProperty('code');
      expect(res.body.code).toBe('UA-EML-002');
    });
  });

  // ── ET-05: Delete email template ──

  describe('ET-05: Delete email template', () => {
    it('should delete a template and return 204', async () => {
      const body = templateBody();
      await request(app.getHttpServer())
        .post('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body)
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/email/templates/${body.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/email/templates/${body.slug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should return 404 when deleting non-existent template', async () => {
      await request(app.getHttpServer())
        .delete('/email/templates/nonexistent-slug-xyz')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
