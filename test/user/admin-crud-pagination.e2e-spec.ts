import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../helpers/create-test-app';
import { UserService } from '../../src/user/service/user.service';
import { UserRole } from '../../src/user/entities/user.entity';

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

    // Promote to admin role via UserService
    const userService = app.get(UserService);
    await userService.update(adminUserId, { role: UserRole.ADMIN } as any);

    // Login AGAIN to get fresh JWT with admin role
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('PATCH /admin/users/:id (update)', () => {
    it('should update user name and lastName', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated', lastName: 'Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated');
      expect(response.body.lastName).toBe('Name');
    });

    it('should return 400 for non-existent user', async () => {
      await request(app.getHttpServer())
        .patch('/admin/users/000000000000000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' })
        .expect(400);
    });
  });

  describe('DELETE /admin/users/:id (soft delete)', () => {
    it('should soft delete a user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/admin/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /admin/users/:id/active (toggle)', () => {
    it('should return 400 for deleted user', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/users/${adminUserId}/active`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /admin/users (pagination)', () => {
    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/admin/users').expect(401);
    });

    it('should return UserDTO[] without page param (backward compat)', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return paginated envelope with page param', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 400 for invalid page (page=0)', async () => {
      await request(app.getHttpServer())
        .get('/admin/users?page=0')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 400 for invalid sortBy', async () => {
      await request(app.getHttpServer())
        .get('/admin/users?page=1&sortBy=invalidField')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return 400 for invalid sortOrder', async () => {
      await request(app.getHttpServer())
        .get('/admin/users?page=1&sortOrder=random')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should return empty results for non-matching role filter', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&role=superadmin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
      expect(response.body.totalPages).toBe(0);
    });

    it('should filter by isActive', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&isActive=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should search across fields', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/users?page=1&search=admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });
});
