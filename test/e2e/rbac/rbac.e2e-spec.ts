import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService, USER_PERMISSIONS } from '../../../src/rbac/services/role.service';
import { UserRole } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;
  // The `user` role is shared with every other e2e suite in the run, so the
  // mutation exercised below is undone in afterAll (auth-me asserts the seeded
  // effective permissions of that role).
  let userRoleId: string;

  const regularUser = {
    email: `user-${Date.now()}@example.com`,
    userName: `user-${Date.now()}`,
    password: 'U5erW0rd!x',
    name: 'Regular',
    lastName: 'User',
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Seed a REAL admin user (role: UserRole.ADMIN) via the helper
    const { adminToken: t } = await seedAdminForE2E(app);
    adminToken = t;

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

    // Seed roles and permissions directly through the app's services.
    // This bypasses any stale cache issues and ensures the DB has data.
    const permissionService = app.get(PermissionService);
    const roleService = app.get(RoleService);
    await permissionService.seedDefaultPermissions();
    await roleService.seedDefaultRoles();

    const userRole = await roleService.findByName(UserRole.USER);
    if (!userRole) {
      throw new Error('Default `user` role was not seeded');
    }
    userRoleId = userRole._id.toString();
  });

  afterAll(async () => {
    if (app && userRoleId) {
      const roleService = app.get(RoleService);
      await roleService.updatePermissions(userRoleId, [...USER_PERMISSIONS]);
    }
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

  describe('PUT /roles/:id/permissions', () => {
    let roleId: string;

    beforeAll(async () => {
      // Grab an existing role ID to update
      const rolesRes = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      roleId = rolesRes.body.roles.find((r: any) => r.name === 'user')._id;
    });

    it('should update role permissions as admin (200)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: ['user:read'] })
        .expect(200);

      expect(response.body.role).toBeDefined();
      expect(response.body.role._id).toBe(roleId);
      expect(response.body.role.permissionIds).toContain('user:read');
    });

    it('should return 403 for non-admin authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ permissionIds: ['user:read'] })
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.code).toBe('UA-SEC-002');
    });

    it('should return 401 for unauthenticated request', async () => {
      await request(app.getHttpServer())
        .put(`/roles/${roleId}/permissions`)
        .send({ permissionIds: ['user:read'] })
        .expect(401);
    });

    it('should return 404 for unknown role id', async () => {
      const res = await request(app.getHttpServer())
        .put('/roles/000000000000000000000001/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: ['user:read'] })
        .expect(404);

      expect(res.body).toHaveProperty('code', 'UA-COM-002');
    });
  });
});
