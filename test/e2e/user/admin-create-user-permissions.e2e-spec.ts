import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService, USER_PERMISSIONS } from '../../../src/rbac/services/role.service';
import { UserRole } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';
import { expectValidationError } from '../../helpers/validation-error';

/**
 * COU-268 — an admin assigns explicit permissions when creating a user through
 * `POST /admin/users` (S4), unknown or wildcard permissions are rejected (S5,
 * S10), omitting them keeps the role inheritance (S3, S6) and public
 * registration still cannot choose role or permissions (S7, S9).
 *
 * `UserDTO` does not expose `permissions`, so persistence is proven through the
 * public read path: the created user logs in and `GET /auth/me` returns the
 * effective set. When the user has no explicit grants that set is exactly the
 * role's permissions (the A6 rule), so an extra `audit:read` can only come from
 * the admin's grant.
 */
describe('Admin user creation with explicit permissions (e2e)', () => {
  let app: INestApplication;

  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const password = 'Adm1nCreated!x';

  let adminToken: string;

  const newUser = (label: string) => ({
    name: 'Created',
    lastName: label,
    email: `admin-created-${label}-${unique}@example.com`,
    userName: `admin-created-${label}-${unique}`,
    password,
  });

  /** Effective permissions of a user, read through the public `/auth/me`. */
  const effectivePermissionsOf = async (email: string): Promise<{ role: UserRole; permissions: string[] }> => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    return { role: me.body.role, permissions: me.body.permissions };
  };

  beforeAll(async () => {
    app = await createTestApp();

    // The catalog must exist for the validation to have anything to match.
    await app.get(PermissionService).seedDefaultPermissions();
    await app.get(RoleService).seedDefaultRoles();

    const admin = await seedAdminForE2E(app);
    adminToken = admin.adminToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /admin/users with permissions', () => {
    it('persists the granted permission so it shows up as effective (S4)', async () => {
      const user = newUser('granted');

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...user, permissions: ['audit:read'] })
        .expect(201);

      const { role, permissions } = await effectivePermissionsOf(user.email);

      expect(role).toBe(UserRole.USER);
      expect(new Set(permissions)).toEqual(new Set([...USER_PERMISSIONS, 'audit:read']));
    });

    it('rejects a permission missing from the catalog with 400 UA-COM-005 (S5)', async () => {
      const user = newUser('unknown-permission');

      const response = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...user, permissions: ['ghost:read'] })
        .expect(400);

      expect(response.body.code).toBe('UA-COM-005');

      // The rejection happens before the write, so the account was never created.
      await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password }).expect(401);
    });

    it('rejects the wildcard as an explicit permission (S10)', async () => {
      const user = newUser('wildcard');

      const response = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...user, permissions: ['*'] })
        .expect(400);

      expect(response.body.code).toBe('UA-COM-005');
    });

    it('inherits only the role permissions when the field is omitted (S3, S6)', async () => {
      const user = newUser('inherited');

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(user)
        .expect(201);

      const { role, permissions } = await effectivePermissionsOf(user.email);

      expect(role).toBe(UserRole.USER);
      expect(new Set(permissions)).toEqual(new Set(USER_PERMISSIONS));
    });
  });

  describe('public registration stays self-service only (S7, S9)', () => {
    it('rejects role and permissions sent to POST /auth/register', async () => {
      const user = newUser('self-registered-escalation');

      // The global ValidationPipe forbids unknown properties, so a self-registering
      // user cannot even smuggle a role or a permission into the payload. The harness
      // installs the production pipe (COU-339), so the real error contract is asserted.
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...user, role: UserRole.ADMIN, permissions: ['*'] })
        .expect(400);

      expectValidationError(response.body, 'role');

      // Nothing was created by the rejected registration.
      await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password }).expect(401);
    });

    it('a plain registration yields the user role with only the role permissions', async () => {
      const user = newUser('self-registered');

      const registered = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: registered.body.verificationToken })
        .expect(200);

      const { role, permissions } = await effectivePermissionsOf(user.email);

      expect(role).toBe(UserRole.USER);
      expect(new Set(permissions)).toEqual(new Set(USER_PERMISSIONS));
      expect(permissions).not.toContain('*');
    });
  });
});
