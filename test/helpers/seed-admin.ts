import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserService } from '../../src/user/service/user.service';
import { UserRole } from '../../src/user/entities/user.entity';

export interface AdminSeedResult {
  adminUser: { email: string; userName: string; password: string };
  adminToken: string;
}

export const ADMIN_CREDENTIALS = {
  email: 'admin-e2e@countergank.test',
  userName: 'admin-e2e',
  password: 'AdminE2E!Test1',
  role: UserRole.ADMIN,
};

export async function seedAdminForE2E(app: INestApplication): Promise<AdminSeedResult> {
  const userService = app.get(UserService);
  const { email, userName, password, role } = ADMIN_CREDENTIALS;

  try {
    await userService.createWithRole({
      email,
      userName,
      password,
      name: 'Admin',
      lastName: 'E2E',
      role,
      permissions: [],
      isActive: true,
    });
  } catch (error: unknown) {
    const err = error as { kind?: { kind?: string } };
    if (err?.kind?.kind !== 'ENTITY_EMAIL_ALREADY_EXISTS' && err?.kind?.kind !== 'ENTITY_NAME_ALREADY_EXISTS') throw error;
  }

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    adminUser: { email, userName, password },
    adminToken: loginResponse.body.accessToken,
  };
}
