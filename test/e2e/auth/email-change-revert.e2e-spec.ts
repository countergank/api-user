import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { EmailEvents } from '../../../src/email/constants/email.events';
import { User } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';
import { findUserDocument, requestEmailChangeCode } from '../../helpers/email-change-code';

const PASSWORD = 'TestW0rd!x97';

/** Collects the payloads of one event while a request runs. */
  const captureEvents = (app: INestApplication, event: string): Array<Record<string, unknown>> => {
    const captured: Array<Record<string, unknown>> = [];
    app.get(EventEmitter2).on(event, (payload: Record<string, unknown>) => captured.push(payload));
    return captured;
  };

interface Session {
  accessToken: string;
  refreshToken: string;
}

/**
 * COU-263 — identity-proof code and revert window for the email change (S9).
 *
 * End-to-end flow: request the code at the current address → change with the
 * code → confirm from the new address → previous sessions are dead → revert
 * from the link sent to the previous address.
 *
 * Requires the docker-compose stack (MongoDB + Redis); it is not executed in the
 * unit runner.
 */
describe('Email change with identity code and revert (e2e)', () => {
  let app: INestApplication;

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const testUser = {
    email: `identity-${suffix}@example.com`,
    userName: `identity-${suffix}`,
    password: PASSWORD,
    name: 'Identity',
    lastName: 'Check',
  };
  const newEmail = `identity-new-${suffix}@example.com`;

  const login = async (email = testUser.email, password = PASSWORD): Promise<Session> => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);
    return { accessToken: response.body.accessToken, refreshToken: response.body.refreshToken };
  };

  beforeAll(async () => {
    app = await createTestApp();

    const registered = await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(201);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registered.body.verificationToken })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('S9 — request → change → confirm → sessions down → revert', () => {
    let session: Session;
    let code: string;
    let confirmationToken: string;
    let revertToken: string;
    let sessionAfterChange: Session;

    it('requires a JWT to request the code', async () => {
      await request(app.getHttpServer()).post('/users/change-email/code').expect(401);
    });

    it('sends the code to the current address and keeps it out of the response (S8, S10)', async () => {
      session = await login();

      const codeEvents = captureEvents(app, EmailEvents.EMAIL_CHANGE_CODE_REQUESTED);
      code = await requestEmailChangeCode(app, session.accessToken);

      expect(code).toMatch(/^\d{6}$/);
      // S10: the code is delivered to the address the account has today, not to
      // the proposed one — that is the whole point of the identity proof.
      expect(codeEvents).toHaveLength(1);
      expect(codeEvents[0].email).toBe(testUser.email);

      // S2: only the hash is persisted.
      const stored = await findUserDocument(app, { email: testUser.email });
      expect(stored?.emailChangeCodeHash).toBeDefined();
      expect(stored?.emailChangeCodeHash).not.toBe(code);
      expect(stored?.emailChangeCodeHash).toHaveLength(64);
    });

    it('rejects a missing code with 400 at the DTO (S1)', async () => {
      await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: newEmail })
        .expect(400);
    });

    it('rejects a wrong code with 401 (S1)', async () => {
      const wrong = code === '000000' ? '111111' : '000000';

      const response = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: newEmail, code: wrong })
        .expect(401);

      expect(response.body.code).toBe('UA-AUTH-010');
    });

    it('rejects the current email with 400 (S7)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: testUser.email, code })
        .expect(400);

      expect(response.body.code).toBe('UA-COM-005');
    });

    it('stages the change with the right code but does not apply it yet (S1, S3)', async () => {
      await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: newEmail, code })
        .expect(200);

      const stored = await findUserDocument(app, { email: testUser.email });
      expect(stored).not.toBeNull();
      // S3: the email is untouched until the token sent to the new address is used.
      expect(stored?.email).toBe(testUser.email);
      expect(stored?.pendingEmail).toBe(newEmail);
      confirmationToken = stored?.pendingEmailToken ?? '';
      expect(confirmationToken).not.toHaveLength(0);
    });

    it('refuses the consumed code (S2)', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: `other-${suffix}@example.com`, code })
        .expect(401);

      expect(response.body.code).toBe('UA-AUTH-010');
    });

    it('applies the change on confirmation and kills the previous sessions (S3, S4)', async () => {
      await request(app.getHttpServer())
        .post('/auth/confirm-email-change')
        .send({ token: confirmationToken })
        .expect(201);

      const stored = await findUserDocument(app, { email: newEmail });
      expect(stored).not.toBeNull();
      // S13: the previous address and the revert token are stored together.
      expect(stored?.previousEmail).toBe(testUser.email);
      revertToken = stored?.emailRevertToken ?? '';
      expect(revertToken).not.toHaveLength(0);
      expect(stored?.emailRevertExpires).toBeInstanceOf(Date);

      const rejected = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      expect(rejected.body.code).toBe('UA-AUTH-009');

      // A session opened with the reverted identity must die on revert too (S5).
      sessionAfterChange = await login(newEmail);
    });

    it('reverts from the link without a JWT and notifies both addresses (S5, S17)', async () => {
      const revertEvents = captureEvents(app, EmailEvents.EMAIL_CHANGE_REVERTED);

      const response = await request(app.getHttpServer())
        .post('/auth/revert-email-change')
        .send({ token: revertToken })
        .expect(200);

      // S12: the old and the new address are both told about the revert.
      expect(revertEvents.map((event) => event.email).sort()).toEqual([testUser.email, newEmail].sort());

      expect(response.body).toHaveProperty('message');

      const stored = await findUserDocument(app, { email: testUser.email });
      expect(stored).not.toBeNull();
      // S6: the token stays resolvable so repeat calls can be idempotent.
      expect(stored?.emailRevertToken).toBe(revertToken);
      expect(stored?.previousEmail).toBeUndefined();
    });

    it('answers 410 once the 72-hour window has passed (S5)', async () => {
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const pending = await userModel.findOne({ email: testUser.email }).exec();
      expect(pending).not.toBeNull();

      await userModel
        .updateOne({ _id: pending?._id }, { emailRevertToken: 'expired-token-e2e', previousEmail: 'gone@example.com', emailRevertExpires: new Date(Date.now() - 1000) })
        .exec();

      const response = await request(app.getHttpServer())
        .post('/auth/revert-email-change')
        .send({ token: 'expired-token-e2e' })
        .expect(410);

      expect(response.body).toMatchObject({ code: 'UA-AUTH-011', statusCode: 410 });
    });

    it('keeps the sessions of the reverted identity dead', async () => {
      const rejected = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: sessionAfterChange.refreshToken })
        .expect(401);

      expect(rejected.body.code).toBe('UA-AUTH-009');
    });

    it('is idempotent: the second revert answers 200 without touching the state (S6)', async () => {
      const before = await findUserDocument(app, { email: testUser.email });
      const epochBefore = before?.sessionEpoch;

      await request(app.getHttpServer()).post('/auth/revert-email-change').send({ token: revertToken }).expect(200);

      const after = await findUserDocument(app, { email: testUser.email });
      expect(after?.email).toBe(testUser.email);
      expect(after?.sessionEpoch).toBe(epochBefore);
      expect(after?.emailRevertToken).toBe(revertToken);
    });

    it('rejects an unknown revert token with 401 (S17)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/revert-email-change')
        .send({ token: 'unknown-revert-token' })
        .expect(401);

      expect(response.body.code).toBe('UA-SEC-001');
    });
  });
});
