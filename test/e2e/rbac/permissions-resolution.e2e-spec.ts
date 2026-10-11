import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
import { AuthService, JwtPayload } from '../../../src/auth/auth.service';
import { JwtStrategy } from '../../../src/auth/strategies/jwt.strategy';
import { RoleService, VIEWER_PERMISSIONS } from '../../../src/rbac/services/role.service';
import { UserRole } from '../../../src/user/entities/user.entity';
import { UserService } from '../../../src/user/service/user.service';

/**
 * COU-265 — effective permissions are resolved from the user's role on every
 * authenticated request (role as base, explicit user permissions additive,
 * deduplicated, order preserved).
 *
 * Uses the `viewer` role to stay independent from other e2e specs that mutate
 * the `user` role (e.g. rbac.e2e-spec.ts).
 */
describe('Effective permissions resolution (e2e)', () => {
  let app: INestApplication;
  let roleService: RoleService;
  let userService: UserService;
  let authService: AuthService;
  let jwtStrategy: JwtStrategy;
  let jwtService: JwtService;

  let accessToken: string;
  let userId: string;
  let viewerRoleId: string;

  const unique = Date.now();
  const testUser = {
    email: `cou265-${unique}@example.com`,
    userName: `cou265-${unique}`,
    password: 'U5erW0rd!x',
    name: 'Cou',
    lastName: 'TwoSixtyFive',
  };

  const resolvePermissions = async (): Promise<string[]> => {
    const payload = jwtService.decode(accessToken) as JwtPayload;
    const resolved = await jwtStrategy.validate(payload);
    if (!resolved) {
      throw new Error('JwtStrategy.validate returned no user');
    }
    return resolved.permissions;
  };

  beforeAll(async () => {
    app = await createTestApp();

    roleService = app.get(RoleService);
    userService = app.get(UserService);
    authService = app.get(AuthService);
    jwtStrategy = app.get(JwtStrategy);
    jwtService = app.get(JwtService);

    expect(authService).toBeDefined();

    await roleService.seedDefaultRoles();

    // Pin the `viewer` role deterministically; no other e2e spec mutates it.
    const viewerRole = await roleService.findByName(UserRole.VIEWER);
    if (!viewerRole) {
      throw new Error('Default `viewer` role was not seeded');
    }
    viewerRoleId = viewerRole._id.toString();
    await roleService.updatePermissions(viewerRoleId, VIEWER_PERMISSIONS);

    // Public registration hardcodes role USER (guardrail), so create the
    // viewer-role user directly through the service.
    const created = await userService.createWithRole({
      email: testUser.email,
      userName: testUser.userName,
      password: testUser.password,
      name: testUser.name,
      lastName: testUser.lastName,
      role: UserRole.VIEWER,
      permissions: [],
      isActive: true,
    });
    userId = created.id;

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await roleService.updatePermissions(viewerRoleId, VIEWER_PERMISSIONS);
    await app.close();
  });

  it('AC#1: inherits the role permissions when the user has no explicit ones', async () => {
    await expect(resolvePermissions()).resolves.toEqual([...VIEWER_PERMISSIONS]);
  });

  it('AC#2: unions explicit permissions (dedup, role permissions first)', async () => {
    await userService.update(userId, { permissions: ['audit:read'] });

    await expect(resolvePermissions()).resolves.toEqual([...VIEWER_PERMISSIONS, 'audit:read']);
  });

  it('AC#3: reflects a role permission change without restarting the service', async () => {
    await roleService.updatePermissions(viewerRoleId, ['user:read', 'user:delete']);

    await expect(resolvePermissions()).resolves.toEqual(['user:read', 'user:delete', 'audit:read']);
  });

  it('AC#4: resolves a usable identity through the resolved user object', async () => {
    await request(app.getHttpServer())
      .patch('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'COU265' })
      .expect(200);
  });
});
