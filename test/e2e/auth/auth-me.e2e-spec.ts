import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  ADMIN_PERMISSIONS,
  RoleService,
  USER_PERMISSIONS,
  VIEWER_PERMISSIONS,
} from '../../../src/rbac/services/role.service';
import { UserRole } from '../../../src/user/entities/user.entity';
import { UserService } from '../../../src/user/service/user.service';
import { createTestApp } from '../../helpers/create-test-app';
import { ADMIN_CREDENTIALS, seedAdminForE2E } from '../../helpers/seed-admin';

describe('GET /auth/me (e2e)', () => {
  let app: INestApplication;
  let roleService: RoleService;
  let userService: UserService;

  let adminToken: string;
  let userToken: string;
  let viewerToken: string;

  const unique = Date.now();
  const password = 'MeE2eW0rd!x';
  const meKeys = ['email', 'id', 'lastName', 'name', 'permissions', 'role'];

  // Order-independent comparison: the effective permission set is a contract,
  // its array order is an implementation detail of the merge.
  const expectPermissionSet = (actual: string[], expected: string[]): void => {
    expect(new Set(actual)).toEqual(new Set(expected));
    expect(actual).toHaveLength(expected.length);
  };

  const createUserWithRole = async (role: UserRole, label: string): Promise<string> => {
    const email = `me-${label}-${unique}@example.com`;
    const userName = `me-${label}-${unique}`;

    await userService.createWithRole({
      email,
      userName,
      password,
      name: 'Me',
      lastName: label,
      role,
      permissions: [],
      isActive: true,
    });

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);

    return loginRes.body.accessToken;
  };

  beforeAll(async () => {
    app = await createTestApp();
    roleService = app.get(RoleService);
    userService = app.get(UserService);

    // The three default roles are seeded with exactly these permission sets by
    // test/global-setup.js, and seedDefaultRoles() only inserts them when the
    // collection is empty. This spec reads that state and never mutates it, so
    // it cannot pollute roles shared with other e2e specs running in parallel.
    await roleService.seedDefaultRoles();

    const admin = await seedAdminForE2E(app);
    adminToken = admin.adminToken;

    userToken = await createUserWithRole(UserRole.USER, 'user');
    viewerToken = await createUserWithRole(UserRole.VIEWER, 'viewer');
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('authenticated roles', () => {
    it('returns role and effective permissions for admin (`*`)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.id).toEqual(expect.any(String));
      expect(res.body.name).toEqual(expect.any(String));
      expect(res.body.lastName).toEqual(expect.any(String));
      expect(res.body.email).toBe(ADMIN_CREDENTIALS.email);
      expect(res.body.role).toBe(UserRole.ADMIN);
      expectPermissionSet(res.body.permissions, ADMIN_PERMISSIONS);
    });

    it('returns role and effective permissions for user', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.role).toBe(UserRole.USER);
      expectPermissionSet(res.body.permissions, USER_PERMISSIONS);
    });

    it('returns role and effective permissions for viewer', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      expect(res.body.role).toBe(UserRole.VIEWER);
      expectPermissionSet(res.body.permissions, VIEWER_PERMISSIONS);
    });

    it('returns exactly the six whitelisted keys (no internal fields)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Object.keys(res.body).sort()).toEqual(meKeys);

      for (const field of [
        'password',
        'resetPasswordToken',
        'emailVerificationToken',
        'pendingEmailToken',
        'failedLoginAttempts',
        'lockedUntil',
        'deletedAt',
        'isActive',
        'userName',
        'createdAt',
        'updatedAt',
        '_id',
        '__v',
      ]) {
        expect(res.body).not.toHaveProperty(field);
      }
    });
  });

  describe('authentication errors', () => {
    it('rejects without a token (401 UA-SEC-001)', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me').expect(401);

      expect(res.body.code).toBe('UA-SEC-001');
    });

    it('rejects with an invalid token (401 UA-SEC-001)', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer not-a-real-token')
        .expect(401);

      expect(res.body.code).toBe('UA-SEC-001');
    });
  });
});
