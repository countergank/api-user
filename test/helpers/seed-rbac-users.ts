import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserService } from '../../src/user/service/user.service';
import { UserRole } from '../../src/user/entities/user.entity';

export interface SeededRbacUser {
  email: string;
  userName: string;
  password: string;
  token: string;
}

/**
 * Creates an active user with the given role directly through the service and
 * returns a usable access token. Public registration hardcodes the `user` role,
 * so this helper is the way to seed any other role for RBAC e2e coverage.
 *
 * `permissions` are explicit grants added on top of the role's permissions
 * (they are additive; `*` and `resource:*` are supported), which lets a spec
 * seed a wildcard holder without inventing a new role.
 */
export async function seedRbacUser(
  app: INestApplication,
  role: UserRole,
  label: string,
  permissions: string[] = [],
): Promise<SeededRbacUser> {
  const userService = app.get(UserService);
  const unique = `${label}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `${unique}@example.com`;
  const userName = unique;
  const password = 'U5erW0rd!x';

  await userService.createWithRole({
    email,
    userName,
    password,
    name: 'RBAC',
    lastName: label,
    role,
    permissions,
    isActive: true,
  });

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    email,
    userName,
    password,
    token: loginResponse.body.accessToken,
  };
}
