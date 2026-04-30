import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const adminUser = {
    email: `admin-${Date.now()}@example.com`,
    userName: `admin-${Date.now()}`,
    password: 'AdminPassword123!',
    name: 'Admin',
    lastName: 'User',
  };

  const regularUser = {
    email: `user-${Date.now()}@example.com`,
    userName: `user-${Date.now()}`,
    password: 'UserPassword123!',
    name: 'Regular',
    lastName: 'User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Register and verify admin user
    const adminRegRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: adminRegRes.body.verificationToken })
      .expect(201);

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);

    adminToken = adminLoginRes.body.accessToken;

    // Register and verify regular user
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

  describe('/permissions (GET)', () => {
    it('should list all permissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.permissions).toBeInstanceOf(Array);
      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('should include user:create permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const permissionNames = response.body.permissions.map((p: any) => p.name);
      expect(permissionNames).toContain('user:create');
    });
  });

  describe('/roles (GET)', () => {
    it('should list all roles', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.roles).toBeInstanceOf(Array);
      expect(response.body.roles.length).toBeGreaterThan(0);
    });

    it('should include admin, user, viewer roles', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const roleNames = response.body.roles.map((r: any) => r.name);
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('user');
      expect(roleNames).toContain('viewer');
    });
  });
});
