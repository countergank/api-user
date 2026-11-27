import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { authenticator } from 'otplib';
import { createTestApp } from '../../helpers/create-test-app';
import { seedAdminForE2E } from '../../helpers/seed-admin';

/**
 * E2E del enrolamiento TOTP (#566): enroll → activate, budget de intentos y
 * no exposición del secreto. El challenge del login pertenece a #567.
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
});
