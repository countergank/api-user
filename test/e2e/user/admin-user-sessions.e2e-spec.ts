import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTestApp } from '../../helpers/create-test-app';
import { User, UserRole } from '../../../src/user/entities/user.entity';

interface AuthBody {
  sessionId: string;
  accessToken: string;
  refreshToken: string;
}

interface RegisterBody extends AuthBody {
  user: { id: string };
  verificationToken: string;
}

interface SessionItem {
  id: string;
  device: string | null;
  ip: string | null;
  issuedAt: string;
  lastAccessAt: string;
  expiresAt: string;
}

/**
 * Sesiones activas de administración, probadas por HTTP contra la aplicación
 * real: listar con metadatos, revocar una sesión sin matar a sus hermanas y
 * force-logout que invalida access y refresh al instante.
 *
 * La validez de un refresh token solo se comprueba canjeándolo en
 * `POST /auth/refresh`: cada canje exitoso rota el `jti` (el token original
 * queda en denylist), así que el token fresco devuelto se captura para las
 * aserciones siguientes de esa misma sesión.
 */
describe('Admin Users sessions (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const stamp = Date.now();

  const makeUser = (slug: string) => ({
    email: `sessions-${slug}-${stamp}@example.com`,
    userName: `sessions-${slug}-${stamp}`,
    password: 'R0bust@X7kQw',
    name: 'Session',
    lastName: slug,
  });

  const s1User = makeUser('two-logins');
  const s1IdleUser = makeUser('no-logins');
  const s5User = makeUser('revoked-one');
  const userA = makeUser('force-logout-a');
  const userB = makeUser('force-logout-b');
  const viewer = makeUser('viewer');
  const viewerTarget = makeUser('viewer-target');

  const userIds = new Map<ReturnType<typeof makeUser>, string>();

  // El registro abre una sesión (device null): el alta ya emite el par de
  // tokens. Los tests que exigen un recuento exacto la revocan por la
  // interfaz pública antes de entrar en escenario.
  const registerBodies = new Map<ReturnType<typeof makeUser>, RegisterBody>();

  const registerAndVerify = async (user: ReturnType<typeof makeUser>): Promise<RegisterBody> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);

    const body = registerRes.body as RegisterBody;
    userIds.set(user, body.user.id);
    registerBodies.set(user, body);
    return body;
  };

  const login = async (user: ReturnType<typeof makeUser>, userAgent?: string): Promise<AuthBody> => {
    const req = request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: user.password });
    const res = await (userAgent ? req.set('User-Agent', userAgent) : req).expect(200);
    return res.body as AuthBody;
  };

  const admin = (method: 'get' | 'delete' | 'post', path: string, token: string) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  const exchangeRefresh = (refreshToken: string) =>
    request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });

  beforeAll(async () => {
    app = await createTestApp();

    const adminUser = makeUser('admin');
    const adminRegister = await registerAndVerify(adminUser);
    const userModel = app.get<Model<User>>(getModelToken(User.name));
    await userModel.findByIdAndUpdate(adminRegister.user.id, { role: UserRole.ADMIN }).exec();
    adminToken = (await login(adminUser)).accessToken;

    // Los objetivos del resto de tests solo necesitan existir y estar
    // verificados: cada test abre sus propias sesiones con sus logins.
    for (const user of [s1User, s1IdleUser, s5User, userA, userB, viewer, viewerTarget]) {
      await registerAndVerify(user);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('S1 — listado de sesiones activas con metadatos', () => {
    it('lists exactly the two sessions opened by two logins, each with device and ip and no jti', async () => {
      // La sesión que abrió el registro tiene device null: se revoca para que
      // el recuento del listado dependa solo de los dos logins del caso.
      await admin(
        'delete',
        `/admin/users/${userIds.get(s1User)}/sessions/${registerBodies.get(s1User)?.sessionId}`,
        adminToken,
      ).expect(200);

      await login(s1User, 'Mozilla/5.0 TwoLogins Desktop');
      await login(s1User, 'TwoLogins Mobile/1.0');

      const res = await admin('get', `/admin/users/${userIds.get(s1User)}/sessions`, adminToken).expect(200);

      const sessions = res.body as SessionItem[];
      expect(sessions).toHaveLength(2);

      const devices = sessions.map((item) => item.device).sort();
      expect(devices).toEqual(['Mozilla/5.0 TwoLogins Desktop', 'TwoLogins Mobile/1.0']);

      for (const item of sessions) {
        expect(typeof item.ip).toBe('string');
        expect((item.ip as string).length).toBeGreaterThan(0);
        expect(typeof item.id).toBe('string');
        expect(typeof item.issuedAt).toBe('string');
        expect(typeof item.lastAccessAt).toBe('string');
        expect(typeof item.expiresAt).toBe('string');
        expect(new Date(item.expiresAt).getTime()).toBeGreaterThan(new Date(item.issuedAt).getTime());
        expect(item).not.toHaveProperty('jti');
      }
    });

    it('returns an empty list for a verified user with no active sessions', async () => {
      // El registro abre una sesión activa: el auto-cierre con su propio
      // refresh token es la forma pública de dejar el listado a cero.
      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refreshToken: registerBodies.get(s1IdleUser)?.refreshToken })
        .expect(200);

      const res = await admin('get', `/admin/users/${userIds.get(s1IdleUser)}/sessions`, adminToken).expect(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('S2+S5 — revocar una sesión deja vivas a las hermanas', () => {
    it('kills exactly the revoked session: its refresh dies with UA-AUTH-009 and the other two keep refreshing', async () => {
      await admin(
        'delete',
        `/admin/users/${userIds.get(s5User)}/sessions/${registerBodies.get(s5User)?.sessionId}`,
        adminToken,
      ).expect(200);

      const one = await login(s5User, 'RevokedOne Browser A');
      const two = await login(s5User, 'RevokedOne Browser B');
      const three = await login(s5User, 'RevokedOne Browser C');

      await admin('delete', `/admin/users/${userIds.get(s5User)}/sessions/${two.sessionId}`, adminToken).expect(200);

      // La sesión dos está muerta: el canje del par capturado falla, y sigue
      // fallando después de que sus hermanas roten los suyos.
      const revoked = await exchangeRefresh(two.refreshToken);
      expect(revoked.status).toBe(401);
      expect(revoked.body.code).toBe('UA-AUTH-009');

      // Las hermanas sobreviven; el canje rota el jti, así que el token fresco
      // se captura y se vuelve a canjear para probar que la sesión sigue viva.
      const freshOne = await exchangeRefresh(one.refreshToken).expect(200);
      const freshThree = await exchangeRefresh(three.refreshToken).expect(200);

      expect(typeof freshOne.body.accessToken).toBe('string');
      expect(typeof freshThree.body.accessToken).toBe('string');

      await exchangeRefresh((freshOne.body as AuthBody).refreshToken).expect(200);
      await exchangeRefresh((freshThree.body as AuthBody).refreshToken).expect(200);

      const revokedAgain = await exchangeRefresh(two.refreshToken);
      expect(revokedAgain.status).toBe(401);
      expect(revokedAgain.body.code).toBe('UA-AUTH-009');

      const list = await admin('get', `/admin/users/${userIds.get(s5User)}/sessions`, adminToken).expect(200);
      expect((list.body as SessionItem[]).map((item) => item.id).sort()).toEqual(
        [one.sessionId, three.sessionId].sort(),
      );
    });

    it('revoking an unknown session id returns 404 with UA-COM-002', async () => {
      // Un uuid con forma válida que nunca existió: el 404 sale de la búsqueda
      // del registro, no del pipe de validación.
      const unknown = '00000000-0000-4000-8000-000000000000';
      const res = await admin(
        'delete',
        `/admin/users/${userIds.get(s5User)}/sessions/${unknown}`,
        adminToken,
      ).expect(404);
      expect(res.body.code).toBe('UA-COM-002');
    });
  });

  describe('S3+S6 — force-logout invalida access y refresh al instante', () => {
    it('kills user A refresh and access tokens while user B keeps working', async () => {
      const a = await login(userA);
      const b = await login(userB);

      // El endpoint responde 201 (default NestJS para POST sin @HttpCode).
      await admin('post', `/admin/users/${userIds.get(userA)}/logout-all`, adminToken).expect(200);

      const aRefresh = await exchangeRefresh(a.refreshToken);
      expect(aRefresh.status).toBe(401);
      expect(aRefresh.body.code).toBe('UA-AUTH-009');

      // S6: el access token emitido antes del bump de epoch muere al instante
      // (JwtStrategy compara `tv` con `sessionEpoch`, sin margen de 15 min).
      await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .expect(401);

      const bProfile = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${b.accessToken}`)
        .expect(200);

      expect((bProfile.body as { email?: string }).email).toBe(userB.email);

      await exchangeRefresh(b.refreshToken).expect(200);
    });
  });

  describe('S4 — los tres endpoints exigen rol admin', () => {
    it('rejects a viewer token with 403 on list, revoke-one and logout-all', async () => {
      const v = await login(viewer);
      const targetId = userIds.get(s1User);

      await admin('get', `/admin/users/${targetId}/sessions`, v.accessToken).expect(403);
      await admin(
        'delete',
        `/admin/users/${targetId}/sessions/00000000-0000-4000-8000-000000000000`,
        v.accessToken,
      ).expect(403);
      await admin('post', `/admin/users/${targetId}/logout-all`, v.accessToken).expect(403);
    });

    it('rejects a viewer targeting another user’s sessions with 403', async () => {
      const v = await login(viewer);
      await admin('get', `/admin/users/${userIds.get(viewerTarget)}/sessions`, v.accessToken).expect(403);
    });
  });
});
