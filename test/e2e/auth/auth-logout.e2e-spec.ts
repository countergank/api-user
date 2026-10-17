import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { User } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';

const INITIAL_PASSWORD = 'TestW0rd!x97';
const CHANGED_PASSWORD = 'NewW0rd!x97z';

interface Session {
  accessToken: string;
  refreshToken: string;
}

/**
 * COU-264 — logout and refresh-token revocation (S1, S4, S6, S7, S8, S9, S10, S12).
 *
 * Requires the docker-compose stack (MongoDB on 27017 and Redis on 6379):
 * the revocation store lives in Redis.
 */
describe('Auth logout & refresh revocation (e2e)', () => {
  let app: INestApplication;

  const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const testUser = {
    email: `logout-${uniqueSuffix}@example.com`,
    userName: `logout-${uniqueSuffix}`,
    password: INITIAL_PASSWORD,
    name: 'Log',
    lastName: 'Out',
  };

  const login = async (email = testUser.email, password = INITIAL_PASSWORD): Promise<Session> => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(200);

    return { accessToken: response.body.accessToken, refreshToken: response.body.refreshToken };
  };

  const registerAndVerify = async (user: typeof testUser): Promise<void> => {
    const registered = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registered.body.verificationToken })
      .expect(201);
  };

  beforeAll(async () => {
    app = await createTestApp();
    await registerAndVerify(testUser);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/logout (POST)', () => {
    it('revokes the refresh token used to log out and rejects its exchange with 401 (S6, S7, S10)', async () => {
      const session = await login();

      const logout = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      expect(logout.body).toHaveProperty('message');

      const rejected = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      expect(rejected.body.code).toBe('UA-AUTH-009');
    });

    it('works without an access token, so a session can be closed after it expired (S12)', async () => {
      const session = await login();

      // No Authorization header on purpose.
      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: session.refreshToken }).expect(200);
    });

    it('rejects a non-JWT refresh token with 401 INVALID_REFRESH_TOKEN', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: 'definitely-not-a-jwt' })
        .expect(401);

      expect(response.body.code).toBe('UA-AUTH-009');
    });

    it('does not revoke other sessions of the same user', async () => {
      const first = await login();
      const second = await login();

      await request(app.getHttpServer()).post('/auth/logout').send({ refreshToken: first.refreshToken }).expect(200);

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: second.refreshToken }).expect(200);
    });
  });

  describe('/auth/logout-all (POST)', () => {
    it('revokes every session of the user (S8)', async () => {
      const first = await login();
      const second = await login();

      const logoutAll = await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${second.accessToken}`)
        .expect(200);

      expect(logoutAll.body).toHaveProperty('message');

      for (const session of [first, second]) {
        const rejected = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: session.refreshToken })
          .expect(401);

        expect(rejected.body.code).toBe('UA-AUTH-009');
      }
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer()).post('/auth/logout-all').send({}).expect(401);
    });

    it('keeps the sessions issued after the revoke-all valid', async () => {
      const stale = await login();

      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${stale.accessToken}`)
        .expect(200);

      const fresh = await login();

      await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: fresh.refreshToken }).expect(200);
    });
  });

  describe('credential changes', () => {
    it('revokes every session when the password changes (S4, S9)', async () => {
      const session = await login();

      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ currentPassword: INITIAL_PASSWORD, newPassword: CHANGED_PASSWORD })
        .expect(200);

      const rejected = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      expect(rejected.body.code).toBe('UA-AUTH-009');

      // The old password no longer authenticates; the new one does.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: INITIAL_PASSWORD })
        .expect(401);

      const newSession = await login(testUser.email, CHANGED_PASSWORD);
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: newSession.refreshToken })
        .expect(200);
    });
  });

  describe('/auth/confirm-email-change (POST)', () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const emailUser = {
      email: `logout-email-${suffix}@example.com`,
      userName: `logout-email-${suffix}`,
      password: INITIAL_PASSWORD,
      name: 'Mail',
      lastName: 'Change',
    };
    const newEmail = `logout-email-new-${suffix}@example.com`;

    it('revokes every session when the email change is confirmed (S4)', async () => {
      await registerAndVerify(emailUser);
      const session = await login(emailUser.email, emailUser.password);

      await request(app.getHttpServer())
        .post('/users/change-email')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: newEmail })
        .expect(200);

      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const pending = await userModel.findOne({ email: emailUser.email }).exec();
      const pendingToken = pending?.pendingEmailToken;
      expect(pendingToken).toBeDefined();

      await request(app.getHttpServer()).post('/auth/confirm-email-change').send({ token: pendingToken }).expect(201);

      const rejected = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      expect(rejected.body.code).toBe('UA-AUTH-009');
    });
  });
});
