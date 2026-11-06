import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTestApp } from '../../helpers/create-test-app';
import { User, UserRole } from '../../../src/user/entities/user.entity';

/**
 * Issue #535 — El estado de la cuenta (email verificado, cambio de email
 * pendiente y reset de contraseña pendiente) se expone en las respuestas de
 * administración derivado de la presencia de los tokens del modelo, sin
 * exponer ningún token.
 *
 * El `emailVerified` sigue el flujo real de verificación: el usuario se
 * registra sin verificar y el flag pasa a `true` recién después de
 * `POST /auth/verify-email`. Los flags de pendientes se siembran por base
 * porque los tokens se generan en flujos que llegan por email.
 */
describe('Admin Users account state (issue #535, e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userModel: Model<User>;

  const stamp = Date.now();

  const adminUser = {
    email: `admin-account-state-${stamp}@example.com`,
    userName: `admin-account-state-${stamp}`,
    password: 'Adm1nW0rd!x',
    name: 'Admin',
    lastName: 'AccountState',
  };

  const targetUser = {
    email: `target-${stamp}@example.com`,
    userName: `target-${stamp}`,
    password: 'T4rgetW0rd!x',
    name: 'Target',
    lastName: 'AccountState',
  };

  let targetRegisterBody: Record<string, unknown>;

  beforeAll(async () => {
    app = await createTestApp();
    userModel = app.get<Model<User>>(getModelToken(User.name));

    // Admin: alta, verificación, promoción por base y login con el JWT nuevo.
    const adminRegisterRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(adminUser)
      .expect(201);
    const adminId = (adminRegisterRes.body.user as { id: string }).id;

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: adminRegisterRes.body.verificationToken })
      .expect(200);

    await userModel.findByIdAndUpdate(adminId, { role: UserRole.ADMIN }).exec();

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // Cuenta objetivo: registrada y jamás verificada (criterio 5).
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(targetUser)
      .expect(201);
    targetRegisterBody = registerRes.body;
  });

  afterAll(async () => {
    await app.close();
  });

  const targetId = () => (targetRegisterBody.user as { id: string }).id;

  describe('account state in admin responses', () => {
    it('GET /admin/users/:id reports a just-registered account as unverified', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${targetId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.emailVerified).toBe(false);
      expect(res.body.hasPendingEmailChange).toBe(false);
      expect(res.body.hasPendingPasswordReset).toBe(false);
    });

    it('POST /auth/verify-email flips the detail to emailVerified=true', async () => {
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: targetRegisterBody.verificationToken })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/admin/users/${targetId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.emailVerified).toBe(true);
    });

    it('exposes the pending flags derived from the seeded tokens', async () => {
      await userModel
        .findByIdAndUpdate(targetId(), {
          pendingEmailToken: 'seeded-pending-email-token',
          resetPasswordToken: 'seeded-reset-token',
        })
        .exec();

      const res = await request(app.getHttpServer())
        .get(`/admin/users/${targetId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.hasPendingEmailChange).toBe(true);
      expect(res.body.hasPendingPasswordReset).toBe(true);

      await userModel
        .findByIdAndUpdate(targetId(), {
          $unset: { pendingEmailToken: 1, resetPasswordToken: 1 },
        })
        .exec();
    });

    it('GET /admin/users exposes the state in the paginated envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ page: 1, limit: 10, search: targetUser.email })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const target = (res.body.data as Array<Record<string, unknown>>).find(
        (item) => item.id === targetId(),
      );
      expect(target).toBeDefined();
      expect(target?.emailVerified).toBe(true);
      expect(target?.hasPendingEmailChange).toBe(false);
      expect(target?.hasPendingPasswordReset).toBe(false);
    });

    it('reports no password, tokens or pending email in the response', async () => {
      await userModel
        .findByIdAndUpdate(targetId(), {
          pendingEmailToken: 'leak-check-token',
          pendingEmail: 'leak-check@example.com',
        })
        .exec();

      const res = await request(app.getHttpServer())
        .get(`/admin/users/${targetId()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('emailVerificationToken');
      expect(res.body).not.toHaveProperty('pendingEmailToken');
      expect(res.body).not.toHaveProperty('pendingEmail');
      expect(res.body).not.toHaveProperty('resetPasswordToken');

      await userModel
        .findByIdAndUpdate(targetId(), { $unset: { pendingEmailToken: 1, pendingEmail: 1 } })
        .exec();
    });
  });
});
