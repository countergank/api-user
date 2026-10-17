import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService, USER_PERMISSIONS } from '../../../src/rbac/services/role.service';
import { User } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

/**
 * COU-304 — `PATCH /admin/users/:id` must apply the same catalog rule the create
 * path enforces since COU-268: only names present in the catalog are accepted and
 * the `*` wildcard is rejected (S5, S6), a valid list is persisted (S7) and
 * omitting the field leaves the permissions untouched (S8).
 *
 * `UserDTO` does not expose `permissions`, so persistence is proven through the
 * target user's own `GET /auth/me`, where the effective set is the role
 * permissions plus the explicit grants.
 *
 * Every test creates its own target user: no test depends on another's side
 * effects, so any failure is local and the suite can run in isolation.
 */
describe('Admin user update with explicit permissions (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;

  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const password = 'Upd4teUser!x';

  let adminToken: string;
  let counter = 0;

  interface TargetUser {
    id: string;
    email: string;
  }

  const createTargetUser = async (): Promise<TargetUser> => {
    counter += 1;
    const label = `t${counter}`;
    const email = `update-perm-${label}-${unique}@example.com`;

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Target',
        lastName: label,
        email,
        userName: `update-perm-${label}-${unique}`,
        password,
      })
      .expect(201);

    // CreateUserResponseDTO does not expose the id, so it is read from the
    // document the endpoint just created.
    const created = await userModel.findOne({ email }).exec();
    if (!created) {
      throw new Error(`User ${email} was not persisted by POST /admin/users`);
    }

    return { id: created.id, email };
  };

  /** Effective permissions of a user, read through the public `/auth/me`. */
  const effectivePermissions = async (email: string): Promise<string[]> => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);

    return me.body.permissions;
  };

  const patchUser = (id: string, body: Record<string, unknown>) =>
    request(app.getHttpServer()).patch(`/admin/users/${id}`).set('Authorization', `Bearer ${adminToken}`).send(body);

  beforeAll(async () => {
    app = await createTestApp();

    await app.get(PermissionService).seedDefaultPermissions();
    await app.get(RoleService).seedDefaultRoles();

    const admin = await seedAdminForE2E(app);
    adminToken = admin.adminToken;
    userModel = app.get<Model<User>>(getModelToken(User.name));
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a permission missing from the catalog with 400 UA-COM-005 (S5)', async () => {
    const target = await createTargetUser();

    const response = await patchUser(target.id, { permissions: ['ghost:read'] }).expect(400);

    expect(response.body.code).toBe('UA-COM-005');
    // Nothing was granted by the rejected patch.
    expect(new Set(await effectivePermissions(target.email))).toEqual(new Set(USER_PERMISSIONS));
  });

  it('rejects the wildcard with 400 UA-COM-005 (S6)', async () => {
    const target = await createTargetUser();

    const response = await patchUser(target.id, { permissions: ['*'] }).expect(400);

    expect(response.body.code).toBe('UA-COM-005');
    expect(new Set(await effectivePermissions(target.email))).toEqual(new Set(USER_PERMISSIONS));
  });

  it('persists a valid permission so it becomes effective (S7)', async () => {
    const target = await createTargetUser();

    await patchUser(target.id, { permissions: ['audit:read'] }).expect(200);

    expect(new Set(await effectivePermissions(target.email))).toEqual(new Set([...USER_PERMISSIONS, 'audit:read']));
  });

  it('leaves the granted permissions untouched when the field is omitted (S8)', async () => {
    const target = await createTargetUser();

    // Arrange inside the test: grant a permission, then patch only the name.
    await patchUser(target.id, { permissions: ['audit:read'] }).expect(200);

    await patchUser(target.id, { name: 'Renamed' }).expect(200);

    const permissions = await effectivePermissions(target.email);

    expect(new Set(permissions)).toEqual(new Set([...USER_PERMISSIONS, 'audit:read']));
    expect(permissions).not.toContain('*');
  });

  it('rejects the wildcard even when other fields change in the same patch, and applies nothing', async () => {
    const target = await createTargetUser();

    const response = await patchUser(target.id, { name: 'Renamed Again', permissions: ['*'] }).expect(400);

    expect(response.body.code).toBe('UA-COM-005');

    // The whole patch was rejected: the name did not change either.
    const stored = await userModel.findById(target.id).exec();
    expect(stored?.name).toBe('Target');
  });

  it('rejects unauthenticated requests', async () => {
    const target = await createTargetUser();

    await request(app.getHttpServer()).patch(`/admin/users/${target.id}`).send({ permissions: ['audit:read'] }).expect(401);
  });
});
