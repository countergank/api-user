import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTestApp } from '../helpers/create-test-app';
import { User, UserRole } from '../../src/user/entities/user.entity';

describe('Admin Users CRUD (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminUserId: string;

  const adminUser = {
    email: `admin-crud-${Date.now()}@example.com`,
    userName: `admin-crud-${Date.now()}`,
    password: 'Adm1nW0rd!x',
    name: 'Admin',
    lastName: 'CRUD',
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Register user
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser)
      .expect(201);

    adminUserId = registerRes.body.user.id;

    // Verify email
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(201);

    // Promote to admin role directly via Mongoose
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    await userModel.findByIdAndUpdate(adminUserId, { role: UserRole.ADMIN }).exec();

    // Login with fresh JWT (now has admin role)
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Update ---
  it('PATCH /admin/users/:id — should update user name and lastName', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated', lastName: 'Name' })
      .expect(200);

    expect(res.body.name).toBe('Updated');
    expect(res.body.lastName).toBe('Name');
  });

  it('PATCH /admin/users/:id — should return 404 for non-existent user', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' })
      .expect(404);
  });

  it('PATCH /admin/users/:id — should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}`)
      .send({ name: 'Test' })
      .expect(401);
  });

  // --- Delete ---
  it('DELETE /admin/users/:id — should soft delete and return 200', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBeDefined();
    expect(res.body.userId).toBe(adminUserId);
  });

  it('DELETE /admin/users/:id — should be idempotent (200 on already deleted)', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('DELETE /admin/users/:id — should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/users/${adminUserId}`)
      .expect(401);
  });

  // --- Toggle active ---
  it('PATCH /admin/users/:id/active — should return 410 for deleted user', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(410);
  });

  // --- Pagination ---
  it('GET /admin/users — should return 401 without auth', async () => {
    await request(app.getHttpServer()).get('/admin/users').expect(401);
  });

  it('GET /admin/users — returns paginated envelope (default page=1)', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('page', 1);
    expect(res.body).toHaveProperty('limit', 20);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /admin/users?page=1&limit=10 — custom pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it('GET /admin/users?page=0 — should return 400', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /admin/users?sortBy=invalidField — should return 400', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=1&sortBy=invalidField')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /admin/users?sortOrder=random — should return 400', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=1&sortOrder=random')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /admin/users?role=superadmin — empty results for non-matching role', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&role=superadmin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('GET /admin/users?search=admin — returns matching results', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&search=admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(0);
  });
});
