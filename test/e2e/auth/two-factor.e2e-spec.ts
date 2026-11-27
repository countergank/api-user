import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { authenticator } from 'otplib';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

/**
 * E2E del segundo factor: enrolamiento TOTP (#566) y challenge del login
 * (#567). El challenge cubre ambos caminos de login, el budget de códigos y
 * la compatibilidad del login sin 2FA.
 */
describe('TwoFactorController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let adminToken: string;
  let userId: string;

  const testUser = {
    email: `totp-${Date.now()}@example.com`,
    userName: `totpuser-${Date.now()}`,
    password: 'TestW0rd!x97',
    name: 'Totp',
    lastName: 'User',
  };

  // A hardcoded "wrong" code can collide with the real TOTP of the moment, so
  // every wrong code is derived from the valid one and checked against the
  // same ±1 step window the service tolerates.
  const totp = authenticator.clone({ window: 1 });

  function wrongCodeFor(secret: string): string {
    const valid = authenticator.generate(secret);
    for (let delta = 1; delta <= 10; delta++) {
      const candidate = `${(Number(valid[0]) + delta) % 10}${valid.slice(1)}`;
      if (!totp.verify({ token: candidate, secret })) {
        return candidate;
      }
    }
    throw new Error('no wrong code could be derived');
  }

  beforeAll(async () => {
    app = await createTestApp();

    const response = await request(app.getHttpServer()).post('/auth/register').send(testUser).expect(201);
    accessToken = response.body.accessToken;
    userId = response.body.user.id;

    // Login is part of the challenge cycle, so the user must be active.
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: response.body.verificationToken })
      .expect(200);

    ({ adminToken } = await seedAdminForE2E(app));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/2fa/enroll (POST)', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer()).post('/auth/2fa/enroll').expect(401);
    });

    it('returns the secret and the otpauth URL once', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/enroll')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.secret).toMatch(/^[A-Z2-7]+$/);
      expect(response.body.otpauthUrl).toMatch(
        new RegExp(`^otpauth://totp/[^?]*\\?secret=${response.body.secret}`),
      );
    });
  });

  describe('/auth/2fa/activate (POST)', () => {
    let secret: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/enroll')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      secret = response.body.secret;
    });

    it('rejects a wrong code with 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: wrongCodeFor(secret) })
        .expect(401);

      expect(response.body.code).toBe('UA-AUTH-013');
    });

    it('activates with the code generated from the secret', async () => {
      const code = authenticator.generate(secret);
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(200);

      expect(response.body.twoFactorEnabled).toBe(true);
    });

    it('rejects a malformed code with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: 'abc' })
        .expect(400);
    });
  });

  describe('attempt budget', () => {
    it('purges the enrollment after 5 wrong codes and forces re-enrolling', async () => {
      const enroll = await request(app.getHttpServer())
        .post('/auth/2fa/enroll')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      const secret = enroll.body.secret;

      for (let attempt = 0; attempt < 5; attempt++) {
        await request(app.getHttpServer())
          .post('/auth/2fa/activate')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ code: wrongCodeFor(secret) })
          .expect(401);
      }

      // The pending secret was purged: even the code generated from it no
      // longer activates, because there is no enrollment left to confirm.
      const code = authenticator.generate(secret);
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code })
        .expect(400);

      expect(response.body.code).toBe('UA-AUTH-012');
    });
  });

  describe('secret exposure', () => {
    // The budget tests above purged the enrollment, so a fresh one is started
    // here: the document holds a secret again while both endpoints are checked.
    beforeAll(async () => {
      await request(app.getHttpServer())
        .post('/auth/2fa/enroll')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('never leaks the secret through /auth/me', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('twoFactorSecret');
    });

    it('never leaks the secret through the admin user detail', async () => {
      const response = await request(app.getHttpServer())
        .get(`/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(JSON.stringify(response.body)).not.toContain('twoFactorSecret');
    });
  });

  describe('#567 login challenge', () => {
    let secret: string;

    beforeAll(async () => {
      const enroll = await request(app.getHttpServer())
        .post('/auth/2fa/enroll')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
      secret = enroll.body.secret;

      await request(app.getHttpServer())
        .post('/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: authenticator.generate(secret) })
        .expect(200);
    });

    it('login returns a pending challenge instead of tokens (S1, S2)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(response.body.twoFactorRequired).toBe(true);
      expect(typeof response.body.challengeToken).toBe('string');
      expect(response.body.challengeToken).not.toHaveLength(0);
      expect(response.body).not.toHaveProperty('accessToken');
      expect(response.body).not.toHaveProperty('refreshToken');
      expect(response.body).not.toHaveProperty('sessionId');
    });

    it('exchanges the challenge token and a valid TOTP code for tokens, and /auth/me works (S3)', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/auth/2fa/challenge')
        .send({ challengeToken: login.body.challengeToken, code: authenticator.generate(secret) })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
      expect(response.body.sessionId).toBeTruthy();

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${response.body.accessToken}`)
        .expect(200);
    });

    it('rejects a malformed code with 400', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/2fa/challenge')
        .send({ challengeToken: login.body.challengeToken, code: 'abc' })
        .expect(400);
    });

    it('rejects an unknown challenge token with 401 UA-AUTH-014', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/challenge')
        .send({ challengeToken: 'unknown-challenge-token', code: authenticator.generate(secret) })
        .expect(401);

      expect(response.body.code).toBe('UA-AUTH-014');
    });

    it('kills the challenge after 5 wrong codes: even the correct code is then rejected (S4)', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);
      const challengeToken = login.body.challengeToken;

      for (let attempt = 0; attempt < 5; attempt++) {
        const response = await request(app.getHttpServer())
          .post('/auth/2fa/challenge')
          .send({ challengeToken, code: wrongCodeFor(secret) })
          .expect(401);

        expect(response.body.code).toBe('UA-AUTH-013');
      }

      // The budget was exhausted and the entry deleted: the challenge is
      // dead even for the code that would be valid right now.
      const response = await request(app.getHttpServer())
        .post('/auth/2fa/challenge')
        .send({ challengeToken, code: authenticator.generate(secret) })
        .expect(401);

      expect(response.body.code).toBe('UA-AUTH-014');
    });

    it('logs in a non-2FA user directly, with tokens and no challenge (S5)', async () => {
      const plainUser = {
        email: `plain-${Date.now()}@example.com`,
        userName: `plainuser-${Date.now()}`,
        password: 'TestW0rd!x97',
        name: 'Plain',
        lastName: 'User',
      };
      const registered = await request(app.getHttpServer()).post('/auth/register').send(plainUser).expect(201);
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: registered.body.verificationToken })
        .expect(200);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: plainUser.email, password: plainUser.password })
        .expect(200);

      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
      expect(response.body).not.toHaveProperty('challengeToken');
      expect(response.body).not.toHaveProperty('twoFactorRequired');
    });
  });
});
