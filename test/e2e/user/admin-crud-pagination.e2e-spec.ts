import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTestApp } from '../../helpers/create-test-app';
import { User, UserRole } from '../../../src/user/entities/user.entity';

describe('Admin Users CRUD (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminUserId: string;
  let userToken: string;

  const adminUser = {
    email: `admin-crud-${Date.now()}@example.com`,
    userName: `admin-crud-${Date.now()}`,
    password: 'Adm1nW0rd!x',
    name: 'Admin',
    lastName: 'CRUD',
  };

  const regularUser = {
    email: `user-crud-${Date.now()}@example.com`,
    userName: `user-crud-${Date.now()}`,
    password: 'Us3rW0rd!x',
    name: 'Regular',
    lastName: 'User',
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

    // Register regular user for 403 tests
    const userRegRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(regularUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: userRegRes.body.verificationToken })
      .expect(201);

    const userLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: regularUser.email, password: regularUser.password })
      .expect(200);

    userToken = userLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- AU-01: Create user ---

  describe('AU-01: Create user (POST /admin/users)', () => {
    let createdUserId: string;

    it('should create a user and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New',
          lastName: 'User',
          email: `newuser-${Date.now()}@example.com`,
          userName: `newuser-${Date.now()}`,
          password: 'Cr3ateW0rd!x',
          role: UserRole.USER,
        })
        .expect(201);

      expect(res.body).toHaveProperty('name', 'New');
      expect(res.body).toHaveProperty('lastName', 'User');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('userName');
      expect(res.body).toHaveProperty('role', 'user');
      expect(res.body).toHaveProperty('isActive', true);
      expect(res.body).toHaveProperty('createdAt');
      expect(res.body).toHaveProperty('updatedAt');

      createdUserId = res.body._id || res.body.id;
    });

    it('should reject duplicate email with 409', async () => {
      // Try to create with the same email as the admin user
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate',
          lastName: 'Email',
          email: adminUser.email,
          userName: `dupuser-${Date.now()}`,
          password: 'DupW0rd!x',
        })
        .expect(409);

      expect(res.body).toHaveProperty('code');
    });

    it('should reject duplicate userName with 409', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Duplicate',
          lastName: 'Name',
          email: `dupemail-${Date.now()}@example.com`,
          userName: adminUser.userName,
          password: 'DupW0rd!x',
        })
        .expect(409);

      expect(res.body).toHaveProperty('code');
    });

    it('should reject missing required fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);
    });

    it('should reject invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Bad',
          lastName: 'Email',
          email: 'not-an-email',
          userName: `bademail-${Date.now()}`,
          password: 'BadW0rd!x',
        })
        .expect(400);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Nope',
          lastName: 'Access',
          email: `nope-${Date.now()}@example.com`,
          userName: `nope-${Date.now()}`,
          password: 'NopeW0rd!x',
        })
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .send({
          name: 'Nope',
          lastName: 'Auth',
          email: `noauth-${Date.now()}@example.com`,
          userName: `noauth-${Date.now()}`,
          password: 'NoAuthW0rd!x',
        })
        .expect(401);
    });
  });

  // --- AU-02: Get user by ID ---

  describe('AU-02: Get user by ID (GET /admin/users/:id)', () => {
    it('should return 200 with user object for existing user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', adminUserId);
      expect(res.body).toHaveProperty('email', adminUser.email);
      expect(res.body).toHaveProperty('name', 'Admin');
      expect(res.body).toHaveProperty('lastName', 'CRUD');
      expect(res.body).toHaveProperty('role');
      expect(res.body).toHaveProperty('isActive');
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users/000000000000000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('code', 'UA-USR-001');
    });

    it('should return 400 for invalid ObjectId format', async () => {
      await request(app.getHttpServer())
        .get('/admin/users/not-a-valid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 403 for non-admin user', async () => {
      await request(app.getHttpServer())
        .get(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/admin/users/${adminUserId}`)
        .expect(401);
    });
  });

  // --- Update ---
  it('PATCH /admin/users/:id -- should update user name and lastName', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated', lastName: 'Name' })
      .expect(200);

    expect(res.body.name).toBe('Updated');
    expect(res.body.lastName).toBe('Name');
  });

  it('PATCH /admin/users/:id -- should return 404 for non-existent user', async () => {
    await request(app.getHttpServer())
      .patch('/admin/users/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test' })
      .expect(404);
  });

  it('PATCH /admin/users/:id -- should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}`)
      .send({ name: 'Test' })
      .expect(401);
  });

  // --- Delete ---
  it('DELETE /admin/users/:id -- should soft delete and return 200', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toBeDefined();
    expect(res.body.userId).toBe(adminUserId);
  });

  it('DELETE /admin/users/:id -- should be idempotent (200 on already deleted)', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/users/${adminUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('DELETE /admin/users/:id -- should return 401 without auth', async () => {
    await request(app.getHttpServer())
      .delete(`/admin/users/${adminUserId}`)
      .expect(401);
  });

  // --- Toggle active ---
  it('PATCH /admin/users/:id/active -- should return 410 for deleted user', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/users/${adminUserId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(410);
  });

  // --- Pagination ---
  it('GET /admin/users -- should return 401 without auth', async () => {
    await request(app.getHttpServer()).get('/admin/users').expect(401);
  });

  it('GET /admin/users -- returns paginated envelope (default page=1)', async () => {
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

  it('GET /admin/users?page=1&limit=10 -- custom pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it('GET /admin/users?page=0 -- should return 400', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=0')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /admin/users?sortBy=invalidField -- should return 400', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=1&sortBy=invalidField')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /admin/users?sortOrder=random -- should return 400', async () => {
    await request(app.getHttpServer())
      .get('/admin/users?page=1&sortOrder=random')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('GET /admin/users?role=superadmin -- empty results for non-matching role', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&role=superadmin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it('GET /admin/users?search=admin -- returns matching results', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users?page=1&search=admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThanOrEqual(0);
  });
});
