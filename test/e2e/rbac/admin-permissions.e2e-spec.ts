import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { PermissionService } from '../../../src/rbac/services/permission.service';
import { RoleService } from '../../../src/rbac/services/role.service';
import { Permission } from '../../../src/rbac/entities/permission.entity';
import { Role } from '../../../src/rbac/entities/role.entity';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

/**
 * Issue #561 — Gestión de permisos por administrador (S1–S6).
 *
 * Cubre el alta (`POST /admin/permissions`) con su guardia de duplicado, la
 * edición (`PATCH /admin/permissions/:id`) y el efecto de desactivar un
 * permiso sobre los roles que ya lo tienen asignado, más la documentación
 * OpenAPI de ambos endpoints bajo el tag `permissions`.
 */
describe('Admin permissions management (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let permissionModel: Model<Permission>;
  let roleModel: Model<Role>;
  let openApiDocument: OpenAPIObject;

  const createdPermissionIds: string[] = [];
  const createdRoleIds: string[] = [];

  const uniquePermissionName = (label: string) =>
    `e2e-${label}:${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  /** Adds the admin bearer token without losing the supertest chain. */
  const auth = <T extends { set: (field: string, value: string) => T }>(req: T): T =>
    req.set('Authorization', `Bearer ${adminToken}`);

  async function createPermission(body: Record<string, unknown>): Promise<Record<string, any>> {
    const response = await auth(request(app.getHttpServer()).post('/admin/permissions')).send(body).expect(201);
    createdPermissionIds.push(response.body.permission._id);
    return response.body.permission;
  }

  beforeAll(async () => {
    app = await createTestApp();
    permissionModel = app.get<Model<Permission>>(getModelToken(Permission.name));
    roleModel = app.get<Model<Role>>(getModelToken(Role.name));

    const { adminToken: token } = await seedAdminForE2E(app);
    adminToken = token;

    // The catalog and the system roles are the substrate of every case below.
    await app.get(PermissionService).seedDefaultPermissions();
    await app.get(RoleService).seedDefaultRoles();

    openApiDocument = SwaggerModule.createDocument(app, new DocumentBuilder().build());
  });

  afterAll(async () => {
    if (app) {
      for (const id of createdRoleIds) {
        await roleModel.findByIdAndDelete(id).exec();
      }
      for (const id of createdPermissionIds) {
        await permissionModel.findByIdAndDelete(id).exec();
      }
      await app.close();
    }
  });

  describe('POST /admin/permissions', () => {
    it('creates a permission with name, description and category (S1)', async () => {
      const name = uniquePermissionName('create');
      const response = await auth(request(app.getHttpServer()).post('/admin/permissions'))
        .send({ name, description: 'Created by e2e', category: 'user' })
        .expect(201);

      expect(response.body.permission).toMatchObject({
        name,
        description: 'Created by e2e',
        category: 'user',
        isSystem: false,
        isActive: true,
      });
    });

    it('rejects a duplicate name with 409 UA-COM-003 and creates nothing (S2)', async () => {
      const name = uniquePermissionName('duplicate');
      await createPermission({ name, category: 'system' });

      const before = await permissionModel.countDocuments({ name }).exec();

      const response = await auth(request(app.getHttpServer()).post('/admin/permissions'))
        .send({ name, description: 'Second time', category: 'user' })
        .expect(409);

      expect(response.body).toMatchObject({ code: 'UA-COM-003', statusCode: 409 });

      const after = await permissionModel.countDocuments({ name }).exec();
      expect(after).toBe(before);
    });

    it('rejects an unknown category with 400', async () => {
      await auth(request(app.getHttpServer()).post('/admin/permissions'))
        .send({ name: uniquePermissionName('bad-category'), category: 'newsletter' })
        .expect(400);
    });

    it('does not accept `isSystem` from the client', async () => {
      await auth(request(app.getHttpServer()).post('/admin/permissions'))
        .send({ name: uniquePermissionName('system-flag'), category: 'user', isSystem: true })
        .expect(400);
    });

    it('rejects a body wrapped in the response envelope with 400 (flat request contract)', async () => {
      const response = await auth(request(app.getHttpServer()).post('/admin/permissions'))
        .send({
          permission: {
            name: uniquePermissionName('wrapped'),
            description: 'Wrapped by mistake',
            category: 'user',
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({ code: 'UA-COM-005', statusCode: 400 });
      expect(response.body.details.map((detail: any) => detail.property)).toContain('permission');
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/admin/permissions')
        .send({ name: uniquePermissionName('anonymous'), category: 'user' })
        .expect(401);
    });
  });

  describe('PATCH /admin/permissions/:id', () => {
    it('updates description, category and isActive (S4)', async () => {
      const permission = await createPermission({
        name: uniquePermissionName('patch'),
        description: 'Before',
        category: 'user',
      });

      const response = await auth(request(app.getHttpServer()).patch(`/admin/permissions/${permission._id}`))
        .send({ description: 'After', category: 'system', isActive: false })
        .expect(200);

      expect(response.body.permission).toMatchObject({
        description: 'After',
        category: 'system',
        isActive: false,
      });
    });

    it('returns 404 for an unknown permission id (S4)', async () => {
      const response = await auth(request(app.getHttpServer()).patch('/admin/permissions/000000000000000000000001'))
        .send({ description: 'ghost' })
        .expect(404);

      expect(response.body).toMatchObject({ code: 'UA-COM-002', statusCode: 404 });
    });

    it('does not accept `name` on patch', async () => {
      const permission = await createPermission({ name: uniquePermissionName('patch-name'), category: 'user' });

      await auth(request(app.getHttpServer()).patch(`/admin/permissions/${permission._id}`))
        .send({ name: 'smuggled:name' })
        .expect(400);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch('/admin/permissions/000000000000000000000001')
        .send({ isActive: false })
        .expect(401);
    });
  });

  describe('created permission lifecycle (S3, S5)', () => {
    it('lists the created permission in GET /permissions and accepts it on a role (S3)', async () => {
      const name = uniquePermissionName('lifecycle');
      await createPermission({ name, description: 'Lifecycle perm', category: 'user' });

      const listResponse = await auth(request(app.getHttpServer()).get('/permissions?limit=100')).expect(200);
      expect(listResponse.body.data.map((permission: any) => permission.name)).toContain(name);

      const roleResponse = await auth(request(app.getHttpServer()).post('/roles'))
        .send({ name: `e2e-role-${Date.now()}-${Math.floor(Math.random() * 10000)}`, permissionIds: [name] })
        .expect(201);
      createdRoleIds.push(roleResponse.body.role._id);

      expect(roleResponse.body.role.permissionIds).toEqual([name]);
    });

    it('keeps the role assignment after the permission is deactivated (S5)', async () => {
      const name = uniquePermissionName('deactivate');
      const permission = await createPermission({ name, description: 'To deactivate', category: 'user' });

      const roleResponse = await auth(request(app.getHttpServer()).post('/roles'))
        .send({ name: `e2e-role-${Date.now()}-${Math.floor(Math.random() * 10000)}`, permissionIds: [name] })
        .expect(201);
      createdRoleIds.push(roleResponse.body.role._id);
      const roleId = roleResponse.body.role._id;

      await auth(request(app.getHttpServer()).patch(`/admin/permissions/${permission._id}`))
        .send({ isActive: false })
        .expect(200);

      // Checked against the model: the deactivation is a logical flag and must
      // not rewrite the role documents that reference the permission.
      const role = await roleModel.findById(roleId).exec();
      expect(role?.permissionIds).toEqual([name]);
    });

    it('reflects a create and an update over a warm permission cache (S3)', async () => {
      // Warm the findAll cache the way a real client does: list before writing.
      await auth(request(app.getHttpServer()).get('/permissions')).expect(200);

      const name = uniquePermissionName('warm-cache');
      await createPermission({ name, description: 'Before rotation', category: 'user' });

      // limit=100: the catalog holds more than the default page of 20, so the
      // new permission may live past page 1 (COU-260 pagination, not staleness).
      const afterCreate = await auth(request(app.getHttpServer()).get('/permissions?limit=100')).expect(200);
      expect(afterCreate.body.data.map((permission: any) => permission.name)).toContain(name);

      const permission = afterCreate.body.data.find((item: any) => item.name === name);
      await auth(request(app.getHttpServer()).patch(`/admin/permissions/${permission._id}`))
        .send({ description: 'After rotation' })
        .expect(200);

      const afterUpdate = await auth(request(app.getHttpServer()).get('/permissions?limit=100')).expect(200);
      expect(afterUpdate.body.data.find((item: any) => item.name === name)?.description).toBe('After rotation');
    });
  });

  describe('OpenAPI documentation (S6)', () => {
    const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

    it('tags both admin permission operations with the permissions tag (S6)', () => {
      const paths = openApiDocument.paths as unknown as Record<string, Record<string, { tags?: string[] }>>;
      const adminPermissionOperations = Object.entries(paths)
        .filter(([path]) => path.startsWith('/admin/permissions'))
        .flatMap(([path, methods]) =>
          Object.entries(methods)
            .filter(([method]) => HTTP_METHODS.includes(method))
            .map(([method, operation]) => ({ label: `${method.toUpperCase()} ${path}`, tags: operation?.tags })),
        );

      expect(adminPermissionOperations).toHaveLength(2);
      for (const operation of adminPermissionOperations) {
        expect({ [operation.label]: operation.tags }).toEqual({
          [operation.label]: ['permissions'],
        });
      }
    });
  });
});
