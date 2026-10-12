import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';
import { seedRbacUser, SeededRbacUser } from '../../helpers/seed-rbac-users';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService } from '../../../src/rbac/services/role.service';
import { UserRole } from '../../../src/user/entities/user.entity';

/**
 * COU-266 — the permission layer is HTTP-observable.
 *
 * Matrix coverage:
 *   - no token on a protected endpoint → 401
 *   - authenticated but missing permission → 403 `UA-SEC-002`
 *   - admin (`*`) → 200 on the same endpoints
 *   - public and self-service endpoints keep working (no regression)
 *
 * `GET /roles` carries no `@Roles`, so a `user`-role token must be rejected by
 * the `PermissionGuard` itself (it lacks `role:read`), not by `RolesGuard`.
 */
describe('Permission guard enforcement (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let plainUser: SeededRbacUser;
  let dedicatedRoleId: string;

  beforeAll(async () => {
    app = await createTestApp();

    const permissionService = app.get(PermissionService);
    const roleService = app.get(RoleService);
    await permissionService.seedDefaultPermissions();
    await roleService.seedDefaultRoles();

    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    plainUser = await seedRbacUser(app, UserRole.USER, 'perm-guard-user');

    // A dedicated role keeps the admin PUT test from mutating the shared
    // `user`/`viewer` roles that other e2e specs touch in parallel.
    const dedicatedRole = await roleService.create({
      name: `e2e-perm-guard-${Date.now()}`,
      description: 'Role used exclusively by the permission-guard e2e spec',
      permissionIds: ['user:read'],
      isSystem: false,
      isDefault: false,
    });
    dedicatedRoleId = dedicatedRole._id.toString();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('401 — unauthenticated', () => {
    it('rejects GET /roles without a token', async () => {
      await request(app.getHttpServer()).get('/roles').expect(401);
    });
  });

  describe('403 — authenticated but missing the permission', () => {
    it('rejects a user-role token on GET /roles (needs role:read)', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${plainUser.token}`)
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.code).toBe('UA-SEC-002');
    });

    it('rejects a user-role token on GET /permissions (needs permission:read)', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${plainUser.token}`)
        .expect(403);

      expect(response.body.code).toBe('UA-SEC-002');
    });

    it('rejects a user-role token on PUT /roles/:id/permissions (needs role:update)', async () => {
      const response = await request(app.getHttpServer())
        .put(`/roles/${dedicatedRoleId}/permissions`)
        .set('Authorization', `Bearer ${plainUser.token}`)
        .send({ permissionIds: ['user:read'] })
        .expect(403);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.code).toBe('UA-SEC-002');
    });
  });

  describe('200 — admin (*) passes the permission layer', () => {
    it('allows GET /roles', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.roles).toBeInstanceOf(Array);
    });

    it('allows GET /permissions', async () => {
      const response = await request(app.getHttpServer())
        .get('/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.permissions).toBeInstanceOf(Array);
    });

    it('allows PUT /roles/:id/permissions', async () => {
      const response = await request(app.getHttpServer())
        .put(`/roles/${dedicatedRoleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ permissionIds: ['user:read'] })
        .expect(200);

      expect(response.body.role).toBeDefined();
      expect(response.body.role.permissionIds).toContain('user:read');
    });
  });

  describe('no regression on public and self-service endpoints', () => {
    it('keeps GET /health public', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
    });

    it('keeps POST /auth/login public', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: plainUser.email, password: plainUser.password })
        .expect(200);

      expect(response.body.accessToken).toBeDefined();
    });

    it('keeps GET /users/profile JWT-only for a plain user token', async () => {
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${plainUser.token}`)
        .expect(200);
    });
  });
});
