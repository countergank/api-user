import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { requestEmailChangeCode } from '../../helpers/email-change-code';
import { seedAdminForE2E } from '../../helpers/seed-admin';
import { seedRbacUser, SeededRbacUser } from '../../helpers/seed-rbac-users';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService } from '../../../src/rbac/services/role.service';
import { UserRole } from '../../../src/user/entities/user.entity';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

interface ProtectedEndpoint {
  method: HttpMethod;
  path: string;
  permission: string;
}

/**
 * COU-266 — every protected endpoint in the permission matrix of
 * `odd/tasks/cou-266-permission-guard.md` ("Permiso requerido") must reject an
 * authenticated caller that lacks the permission with 403 `UA-SEC-002`.
 *
 * Guards run before pipes, so the 403 assertions need no valid payload. A
 * `user`-role token holds `user:read`/`user:update`: on those endpoints the
 * `PermissionGuard` passes and the controller-level `@Roles(ADMIN)` makes
 * `RolesGuard` reject, producing the same `FORBIDDEN` → `UA-SEC-002` contract.
 * On every other endpoint the `PermissionGuard` is the rejecting guard.
 */
const PROTECTED_ENDPOINTS: ProtectedEndpoint[] = [
  { method: 'post', path: '/admin/users', permission: 'user:create' },
  { method: 'get', path: '/admin/users', permission: 'user:read' },
  { method: 'get', path: '/admin/users/000000000000000000000000', permission: 'user:read' },
  { method: 'patch', path: '/admin/users/000000000000000000000000', permission: 'user:update' },
  { method: 'patch', path: '/admin/users/000000000000000000000000/active', permission: 'user:update' },
  { method: 'delete', path: '/admin/users/000000000000000000000000', permission: 'user:delete' },
  { method: 'patch', path: '/admin/users/000000000000000000000000/unlock', permission: 'user:unlock' },
  { method: 'get', path: '/roles', permission: 'role:read' },
  { method: 'put', path: '/roles/000000000000000000000000/permissions', permission: 'role:update' },
  { method: 'get', path: '/permissions', permission: 'permission:read' },
  { method: 'get', path: '/admin/parameters', permission: 'parameter:read' },
  { method: 'get', path: '/admin/parameters/general', permission: 'parameter:read' },
  { method: 'put', path: '/admin/parameters/some-key', permission: 'parameter:update' },
  { method: 'get', path: '/admin/audit-logs', permission: 'audit:read' },
  { method: 'post', path: '/email/send', permission: 'email:send' },
  { method: 'post', path: '/email/send-direct', permission: 'email:send' },
  { method: 'post', path: '/email/templates', permission: 'email:create' },
  { method: 'get', path: '/email/templates', permission: 'email:read' },
  { method: 'get', path: '/email/templates/some-slug', permission: 'email:read' },
  { method: 'patch', path: '/email/templates/some-slug', permission: 'email:update' },
  { method: 'delete', path: '/email/templates/some-slug', permission: 'email:delete' },
  { method: 'post', path: '/admin/i18n/reload', permission: 'i18n:reload' },
];

describe('Permission guard enforcement (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let plainUser: SeededRbacUser;
  let wildcardUser: SeededRbacUser;
  let resourceWildcardUser: SeededRbacUser;
  let dedicatedRoleId: string;

  const callEndpoint = (method: HttpMethod, path: string, token: string) => {
    const server = app.getHttpServer();
    const authorization = `Bearer ${token}`;

    switch (method) {
      case 'get':
        return request(server).get(path).set('Authorization', authorization);
      case 'post':
        return request(server).post(path).set('Authorization', authorization);
      case 'put':
        return request(server).put(path).set('Authorization', authorization);
      case 'patch':
        return request(server).patch(path).set('Authorization', authorization);
      case 'delete':
        return request(server).delete(path).set('Authorization', authorization);
      default:
        throw new Error('Unsupported HTTP method');
    }
  };

  beforeAll(async () => {
    app = await createTestApp();

    const permissionService = app.get(PermissionService);
    const roleService = app.get(RoleService);
    await permissionService.seedDefaultPermissions();
    await roleService.seedDefaultRoles();

    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    plainUser = await seedRbacUser(app, UserRole.USER, 'perm-guard-user');
    // Explicit permissions are additive on top of the role's permissions.
    wildcardUser = await seedRbacUser(app, UserRole.USER, 'perm-guard-star', ['*']);
    resourceWildcardUser = await seedRbacUser(app, UserRole.USER, 'perm-guard-rw', ['role:*']);

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

  describe('403 — the whole protected endpoint matrix enforces UA-SEC-002', () => {
    it.each(PROTECTED_ENDPOINTS)(
      'rejects $method $path (needs $permission)',
      async ({ method, path }) => {
        const response = await callEndpoint(method, path, plainUser.token).send({});

        expect(response.status).toBe(403);
        expect(response.body.code).toBe('UA-SEC-002');
      },
    );
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

    it('allows GET /admin/users', async () => {
      await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('allows GET /admin/parameters', async () => {
      await request(app.getHttpServer())
        .get('/admin/parameters')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('allows GET /admin/audit-logs', async () => {
      await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('allows GET /email/templates', async () => {
      await request(app.getHttpServer())
        .get('/email/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('allows POST /admin/i18n/reload (201 Created)', async () => {
      await request(app.getHttpServer())
        .post('/admin/i18n/reload')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });
  });

  describe('R3-003 — wildcard permissions reach protected endpoints', () => {
    it('allows GET /roles for a user holding *', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${wildcardUser.token}`)
        .expect(200);

      expect(response.body.roles).toBeInstanceOf(Array);
    });

    it('allows GET /roles for a user holding role:*', async () => {
      const response = await request(app.getHttpServer())
        .get('/roles')
        .set('Authorization', `Bearer ${resourceWildcardUser.token}`)
        .expect(200);

      expect(response.body.roles).toBeInstanceOf(Array);
    });
  });

  describe('R3-002 — self-service endpoints are never blocked by the permission guard', () => {
    it('PATCH /users/profile is not blocked (200)', async () => {
      const response = await request(app.getHttpServer())
        .patch('/users/profile')
        .set('Authorization', `Bearer ${plainUser.token}`)
        .send({ name: 'GuardCheck' });

      expect(response.status).not.toBe(403);
      expect(response.status).toBe(200);
    });

    it('POST /users/change-password is not blocked (400 on wrong current password)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${plainUser.token}`)
        .send({ currentPassword: 'Wr0ngW0rd!z', newPassword: 'An0th3rW0rd!a' });

      expect(response.status).not.toBe(403);
      expect(response.status).toBe(400);
    });

    it('POST /users/change-email is not blocked (200)', async () => {
      // COU-263: the endpoint now requires the identity-proof code, so the guard
      // check has to obtain one first. The assertion keeps its intent: a permitted
      // user is not blocked (200), not 403.
      const code = await requestEmailChangeCode(app, plainUser.token);

      const response = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${plainUser.token}`)
        .send({ email: `guard-check-${Date.now()}@example.com`, code });

      expect(response.status).not.toBe(403);
      expect(response.status).toBe(200);
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
