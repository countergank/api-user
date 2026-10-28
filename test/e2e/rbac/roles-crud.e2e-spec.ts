import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService } from '../../../src/rbac/services/role.service';
import { Role } from '../../../src/rbac/entities/role.entity';
import { User } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';
import { expectValidationError } from '../../helpers/validation-error';

/**
 * COU-269 — CRUD de roles (S1–S17).
 *
 * Cubre create/rename/delete, la protección de los roles de sistema, el guardia
 * de "rol en uso" y la validación de `permissionIds` contra el catálogo.
 */
describe('Roles CRUD (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let roleModel: Model<Role>;
  let userModel: Model<User>;

  /** Roles creados por esta suite, para limpiarlos en `afterAll`. */
  const createdRoleIds: string[] = [];
  /** Usuario insertado fuera del esquema (rol custom), para el guardia de uso. */
  let rawUserId: Types.ObjectId | undefined;

  const uniqueRoleName = (label: string) => `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  /** Adds the admin bearer token without losing the supertest chain. */
  const auth = <T extends { set: (field: string, value: string) => T }>(req: T): T =>
    req.set('Authorization', `Bearer ${adminToken}`);

  async function createRole(body: Record<string, unknown>): Promise<Record<string, any>> {
    const response = await auth(request(app.getHttpServer()).post('/roles')).send(body).expect(201);
    createdRoleIds.push(response.body.role._id);
    return response.body.role;
  }

  beforeAll(async () => {
    app = await createTestApp();
    roleModel = app.get<Model<Role>>(getModelToken(Role.name));
    userModel = app.get<Model<User>>(getModelToken(User.name));

    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    // The catalog and the system roles are the substrate of every case below.
    await app.get(PermissionService).seedDefaultPermissions();
    await app.get(RoleService).seedDefaultRoles();
  });

  afterAll(async () => {
    if (app) {
      if (rawUserId) {
        await userModel.collection.deleteOne({ _id: rawUserId });
      }
      for (const id of createdRoleIds) {
        await roleModel.findByIdAndDelete(id).exec();
      }
      await app.close();
    }
  });

  describe('POST /roles', () => {
    it('creates a role with permissions taken from the catalog (S1)', async () => {
      const name = uniqueRoleName('create');
      const response = await auth(request(app.getHttpServer()).post('/roles'))
        .send({ name, description: 'Created by e2e', permissionIds: ['user:read', 'audit:read'] })
        .expect(201);
      createdRoleIds.push(response.body.role._id);

      expect(response.body.role).toMatchObject({
        name,
        description: 'Created by e2e',
        permissionIds: ['user:read', 'audit:read'],
        isSystem: false,
      });
    });

    it('accepts the `*` wildcard used by the admin role (S13)', async () => {
      const role = await createRole({ name: uniqueRoleName('wildcard'), permissionIds: ['*'] });

      expect(role.permissionIds).toEqual(['*']);
    });

    it('rejects a duplicate name with 409 UA-COM-003 (S6)', async () => {
      const name = uniqueRoleName('duplicate');
      await createRole({ name });

      const response = await auth(request(app.getHttpServer()).post('/roles'))
        .send({ name, description: 'Second time' })
        .expect(409);

      expect(response.body).toMatchObject({ code: 'UA-COM-003', statusCode: 409 });
    });

    it('rejects a permission missing from the catalog with 400 UA-COM-005 (S11)', async () => {
      const name = uniqueRoleName('bad-permission');

      const response = await auth(request(app.getHttpServer()).post('/roles'))
        .send({ name, permissionIds: ['user:read', 'nope:none'] })
        .expect(400);

      // The filter translates DomainError messages, so only the code is asserted;
      // the rejected names are covered by the service unit spec.
      expect(response.body).toMatchObject({ code: 'UA-COM-005', statusCode: 400 });

      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      expect(rolesRes.body.roles.map((role: any) => role.name)).not.toContain(name);
    });

    it('does not accept `isSystem` from the client (S4)', async () => {
      await auth(request(app.getHttpServer()).post('/roles'))
        .send({ name: uniqueRoleName('system-flag'), isSystem: true })
        .expect(400);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).post('/roles').send({ name: uniqueRoleName('anonymous') }).expect(401);
    });
  });

  describe('PATCH /roles/:id', () => {
    it('updates the name and the description of a non-system role (S2, S7)', async () => {
      const role = await createRole({ name: uniqueRoleName('patch') });
      const newName = uniqueRoleName('patch-renamed');

      const response = await auth(request(app.getHttpServer()).patch(`/roles/${role._id}`))
        .send({ name: newName, description: 'Renamed by e2e' })
        .expect(200);

      expect(response.body.role).toMatchObject({ name: newName, description: 'Renamed by e2e' });
    });

    it('rejects renaming to an already-existing name with 409 UA-COM-003 (S16)', async () => {
      const first = await createRole({ name: uniqueRoleName('rename-a') });
      const second = await createRole({ name: uniqueRoleName('rename-b') });

      const response = await auth(request(app.getHttpServer()).patch(`/roles/${first._id}`))
        .send({ name: second.name })
        .expect(409);

      expect(response.body).toMatchObject({ code: 'UA-COM-003', statusCode: 409 });
    });

    it('refuses to rename a system role with 403 UA-SEC-002 (S4, S9)', async () => {
      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      const adminRole = rolesRes.body.roles.find((role: any) => role.name === 'admin');

      const response = await auth(request(app.getHttpServer()).patch(`/roles/${adminRole._id}`))
        .send({ name: 'superadmin' })
        .expect(403);

      expect(response.body).toMatchObject({ code: 'UA-SEC-002', statusCode: 403 });
    });

    it('does not accept `permissionIds` on patch (S5)', async () => {
      const role = await createRole({ name: uniqueRoleName('patch-permissions') });

      await auth(request(app.getHttpServer()).patch(`/roles/${role._id}`))
        .send({ permissionIds: ['user:read'] })
        .expect(400);
    });

    it('returns 404 for an unknown role id', async () => {
      const response = await auth(request(app.getHttpServer()).patch('/roles/000000000000000000000001'))
        .send({ description: 'ghost' })
        .expect(404);

      expect(response.body).toMatchObject({ code: 'UA-COM-002', statusCode: 404 });
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).patch('/roles/000000000000000000000001').send({ description: 'x' }).expect(401);
    });
  });

  describe('DELETE /roles/:id', () => {
    it('deletes a non-system role (S3, S8)', async () => {
      const role = await createRole({ name: uniqueRoleName('delete') });

      const response = await auth(request(app.getHttpServer()).delete(`/roles/${role._id}`)).expect(200);

      expect(response.body).toMatchObject({ roleId: role._id });
      expect(typeof response.body.message).toBe('string');

      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      expect(rolesRes.body.roles.map((item: any) => item._id)).not.toContain(role._id);
    });

    it('refuses to delete a system role with 403 UA-SEC-002 (S4, S9)', async () => {
      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      const viewerRole = rolesRes.body.roles.find((role: any) => role.name === 'viewer');

      const response = await auth(request(app.getHttpServer()).delete(`/roles/${viewerRole._id}`)).expect(403);

      expect(response.body).toMatchObject({ code: 'UA-SEC-002', statusCode: 403 });
    });

    it('refuses to delete a role with assigned users with 409 UA-RBAC-001 (S10, S14)', async () => {
      const role = await createRole({ name: uniqueRoleName('in-use') });

      // The user schema only enumerates the seeded roles, so a custom role can
      // only be assigned today through a raw insert. That is exactly the state
      // the guard must protect against.
      const insert = await userModel.collection.insertOne({
        name: 'InUse',
        lastName: 'E2E',
        email: `${role.name}@example.com`,
        userName: role.name,
        password: 'not-a-real-hash',
        role: role.name,
        permissions: [],
        isActive: true,
        sessionEpoch: 0,
        failedLoginAttempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      rawUserId = insert.insertedId;

      const response = await auth(request(app.getHttpServer()).delete(`/roles/${role._id}`)).expect(409);

      expect(response.body).toMatchObject({ code: 'UA-RBAC-001', statusCode: 409 });

      // The role survives the rejected delete.
      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      expect(rolesRes.body.roles.map((item: any) => item._id)).toContain(role._id);
    });

    it('returns 404 for an unknown role id', async () => {
      const response = await auth(request(app.getHttpServer()).delete('/roles/000000000000000000000001')).expect(404);

      expect(response.body).toMatchObject({ code: 'UA-COM-002', statusCode: 404 });
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).delete('/roles/000000000000000000000001').expect(401);
    });
  });

  describe('PUT /roles/:id/permissions (S13)', () => {
    it('accepts the `*` wildcard', async () => {
      const role = await createRole({ name: uniqueRoleName('put-wildcard'), permissionIds: ['user:read'] });

      const response = await auth(request(app.getHttpServer()).put(`/roles/${role._id}/permissions`))
        .send({ permissionIds: ['*'] })
        .expect(200);

      expect(response.body.role.permissionIds).toEqual(['*']);
    });

    it('rejects a permission missing from the catalog with 400 UA-COM-005', async () => {
      const role = await createRole({ name: uniqueRoleName('put-invalid'), permissionIds: ['user:read'] });

      const response = await auth(request(app.getHttpServer()).put(`/roles/${role._id}/permissions`))
        .send({ permissionIds: ['user:read', 'nope:none'] })
        .expect(400);

      expect(response.body).toMatchObject({ code: 'UA-COM-005', statusCode: 400 });

      // Nothing was written: the previous permissions are intact.
      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      const unchanged = rolesRes.body.roles.find((item: any) => item._id === role._id);
      expect(unchanged.permissionIds).toEqual(['user:read']);
    });

    it('rejects an empty body instead of wiping the role permissions (S13)', async () => {
      const role = await createRole({ name: uniqueRoleName('put-empty'), permissionIds: ['user:read'] });

      // Rejected by the DTO before the service. The harness installs the production
      // ValidationPipe (COU-339), so the body carries the real contract; the service
      // array guard itself is pinned by role.service.spec.ts.
      const response = await auth(request(app.getHttpServer()).put(`/roles/${role._id}/permissions`))
        .send({})
        .expect(400);

      expectValidationError(response.body, 'permissionIds');

      // The destructive reading (undefined -> []) never reaches the database.
      const rolesRes = await auth(request(app.getHttpServer()).get('/roles')).expect(200);
      const unchanged = rolesRes.body.roles.find((item: any) => item._id === role._id);
      expect(unchanged.permissionIds).toEqual(['user:read']);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .put('/roles/000000000000000000000001/permissions')
        .send({ permissionIds: ['*'] })
        .expect(401);
    });
  });
});
