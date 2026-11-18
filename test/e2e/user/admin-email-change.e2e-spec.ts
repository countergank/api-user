import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { EmailEvents } from '../../../src/email/constants/email.events';
import { User, UserRole } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';

/**
 * Issue #556 — admin-initiated email change, exercised over real HTTP.
 *
 * Flow under test: an admin starts the change → the new mailbox gets the
 * confirmation link (existing EMAIL_CHANGE_REQUESTED) and the current mailbox
 * the informational notice (EMAIL_CHANGE_ADMIN_REQUESTED) → the user confirms
 * with the existing /auth/confirm-email-change → an admin can also cancel the
 * pending change, idempotently.
 */
describe('Admin email change (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let targetId: string;

  const stamp = Date.now();

  const target = {
    email: `admin-change-${stamp}@example.com`,
    userName: `admin-change-${stamp}`,
    password: 'R0bust@X7kQw',
    name: 'Target',
    lastName: 'AdminChange',
  };
  const newEmail = `admin-change-new-${stamp}@example.com`;

  const registerAndVerify = async (user: typeof target): Promise<string> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);
    return registerRes.body.user.id as string;
  };

  const admin = (method: 'get' | 'post' | 'delete' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${adminToken}`);

  const captureEvents = (event: string): Array<Record<string, unknown>> => {
    const captured: Array<Record<string, unknown>> = [];
    app.get(EventEmitter2).on(event, (payload: Record<string, unknown>) => captured.push(payload));
    return captured;
  };

  beforeAll(async () => {
    app = await createTestApp();

    const adminUser = { ...target, email: `admin-owner-${stamp}@example.com`, userName: `admin-owner-${stamp}` };
    const adminId = await registerAndVerify(adminUser);
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    await userModel.findByIdAndUpdate(adminId, { role: UserRole.ADMIN }).exec();
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);
    adminToken = loginRes.body.accessToken;

    targetId = await registerAndVerify(target);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('admin starts the change (S1, S2, S7, S8)', () => {
    it('requires user:update: 401 without JWT and 403 for a plain user', async () => {
      await request(app.getHttpServer()).post(`/admin/users/${targetId}/change-email`).expect(401);

      const userLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: target.email, password: target.password })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/admin/users/${targetId}/change-email`)
        .set('Authorization', `Bearer ${userLogin.body.accessToken}`)
        .send({ email: newEmail })
        .expect(403);
    });

    it('rejects the current email with 400 (S5 parity)', async () => {
      await admin('post', `/admin/users/${targetId}/change-email`).send({ email: target.email }).expect(400);
    });

    it('answers 404 for an unknown user', async () => {
      await admin('post', `/admin/users/507f191e810c19729de860f0/change-email`)
        .send({ email: newEmail })
        .expect(404);
    });

    it('starts the change: both mailboxes are notified and the token never leaves the server', async () => {
      const requested = captureEvents(EmailEvents.EMAIL_CHANGE_REQUESTED);
      const adminNotice = captureEvents(EmailEvents.EMAIL_CHANGE_ADMIN_REQUESTED);

      const response = await admin('post', `/admin/users/${targetId}/change-email`)
        .send({ email: newEmail })
        .expect(201);

      expect(response.body.message).toBeDefined();
      expect(response.body.userId).toBe(targetId);
      expect(JSON.stringify(response.body)).not.toContain('token');

      // S2: the confirmation link goes to the NEW mailbox.
      expect(requested).toHaveLength(1);
      expect(requested[0]).toMatchObject({ userId: targetId, newEmail, pendingEmailToken: expect.any(String) });

      // S8: the CURRENT mailbox gets the informational notice.
      expect(adminNotice).toHaveLength(1);
      expect(adminNotice[0]).toMatchObject({ email: target.email, newEmail, userId: targetId });
    });

    it('persists the pending state with the admin initiator', async () => {
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const stored = await userModel.findById(targetId).exec();
      expect(stored?.pendingEmail).toBe(newEmail);
      expect(stored?.pendingEmailToken).toEqual(expect.any(String));
      expect(stored?.emailChangeInitiatedBy).toEqual(expect.any(String));
      expect(stored?.emailChangeInitiatedBy).not.toBe('self');
    });
  });

  describe('the user confirms with the existing flow (S7)', () => {
    let confirmationToken: string;

    it('applies the change via /auth/confirm-email-change and records the revert window', async () => {
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const stored = await userModel.findById(targetId).exec();
      confirmationToken = stored?.pendingEmailToken as string;

      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: confirmationToken })
        .expect(200);

      const after = await userModel.findById(targetId).exec();
      expect(after?.email).toBe(newEmail);
      expect(after?.previousEmail).toBe(target.email);
      expect(after?.emailRevertToken).toEqual(expect.any(String));
      // The initiator marker left with the pending state it described.
      expect(after?.emailChangeInitiatedBy).toBeUndefined();
    });
  });

  describe('admin cancels the pending change (S9)', () => {
    const pendingUser = {
      email: `admin-cancel-${stamp}@example.com`,
      userName: `admin-cancel-${stamp}`,
      password: 'R0bust@X7kQw',
      name: 'Cancel',
      lastName: 'AdminChange',
    };
    const pendingNewEmail = `admin-cancel-new-${stamp}@example.com`;
    let pendingUserId: string;

    beforeAll(async () => {
      pendingUserId = await registerAndVerify(pendingUser);
    });

    it('is idempotent when nothing is pending', async () => {
      const response = await admin('delete', `/admin/users/${pendingUserId}/change-email`).expect(200);
      expect(response.body.userId).toBe(pendingUserId);
    });

    it('clears the pending state so the confirmation token is dead', async () => {
      await admin('post', `/admin/users/${pendingUserId}/change-email`)
        .send({ email: pendingNewEmail })
        .expect(201);

      await admin('delete', `/admin/users/${pendingUserId}/change-email`).expect(200);

      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const stored = await userModel.findById(pendingUserId).exec();
      expect(stored?.pendingEmail).toBeUndefined();
      expect(stored?.pendingEmailToken).toBeUndefined();
      expect(stored?.emailChangeInitiatedBy).toBeUndefined();

      // The cleared token no longer confirms anything.
      const userModel2 = app.get<Model<User>>(getModelToken(User.name));
      const deadToken = (await userModel2.findById(pendingUserId).exec())?.pendingEmailToken;
      expect(deadToken).toBeUndefined();
    });

    it('requires user:update: 401 without JWT', async () => {
      await request(app.getHttpServer()).delete(`/admin/users/${pendingUserId}/change-email`).expect(401);
    });

    it('answers 404 for an unknown user', async () => {
      await admin('delete', `/admin/users/507f191e810c19729de860f0/change-email`).expect(404);
    });
  });
});
