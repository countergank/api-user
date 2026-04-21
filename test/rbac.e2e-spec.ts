import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { config } from 'dotenv';
import { AppModule } from '../src/app/app.module';

// Load environment variables
config({ path: '.env.local.testing' });

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

    // Create admin user
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser);
    adminToken = adminResponse.body.accessToken;

    // Create regular user
    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send(regularUser);
    userToken = userResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/permissions (GET)', () => {
    it('should list all permissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .expect(200);

      expect(response.body.permissions).toBeInstanceOf(Array);
      expect(response.body.permissions.length).toBeGreaterThan(0);
    });

    it('should include user:create permission', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
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