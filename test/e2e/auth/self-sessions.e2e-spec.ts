import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';

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
 * Autogestión de sesiones activas probada por HTTP contra la aplicación real:
 * un usuario sin rol admin lista sus propias sesiones y revoca cualquiera de
 * las suyas por id, sin permisos adicionales.
 *
 * La validez de un refresh token solo se comprueba canjeándolo en
 * `POST /auth/refresh`: cada canje exitoso rota el `jti` (el token original
 * queda en denylist), así que el token fresco devuelto se captura para las
 * aserciones siguientes de esa misma sesión.
 */
describe('Auth self-service sessions (e2e)', () => {
  let app: INestApplication;

  const stamp = Date.now();

  const makeUser = (slug: string) => ({
    email: `self-sessions-${slug}-${stamp}@example.com`,
    userName: `self-sessions-${slug}-${stamp}`,
    password: 'R0bust@X7kQw',
    name: 'SelfSession',
    lastName: slug,
  });

  const twoLoginsUser = makeUser('two-logins');
  const revokedOneUser = makeUser('revoked-one');
  const viewerUser = makeUser('viewer');

  const registerBodies = new Map<ReturnType<typeof makeUser>, RegisterBody>();

  const registerAndVerify = async (user: ReturnType<typeof makeUser>): Promise<RegisterBody> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);

    const body = registerRes.body as RegisterBody;
    registerBodies.set(user, body);
    return body;
  };

  const login = async (user: ReturnType<typeof makeUser>, userAgent?: string): Promise<AuthBody> => {
    const req = request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: user.password });
    const res = await (userAgent ? req.set('User-Agent', userAgent) : req).expect(200);
    return res.body as AuthBody;
  };

  const self = (method: 'get' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${token}`);

  const exchangeRefresh = (refreshToken: string) =>
    request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken });

  beforeAll(async () => {
    app = await createTestApp();

    for (const user of [twoLoginsUser, revokedOneUser, viewerUser]) {
      await registerAndVerify(user);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists exactly the two sessions opened by two logins, without exposing any jti', async () => {
    // La sesión que abrió el registro tiene device null: se revoca por la
    // propia interfaz para que el recuento dependa solo de los dos logins.
    await self(
      'delete',
      `/auth/sessions/${registerBodies.get(twoLoginsUser)?.sessionId}`,
      registerBodies.get(twoLoginsUser)?.accessToken as string,
    ).expect(200);

    const first = await login(twoLoginsUser, 'SelfSessions Desktop');
    await login(twoLoginsUser, 'SelfSessions Mobile/1.0');

    const res = await self('get', '/auth/sessions', first.accessToken).expect(200);

    const sessions = res.body as SessionItem[];
    expect(sessions).toHaveLength(2);

    const devices = sessions.map((item) => item.device).sort();
    expect(devices).toEqual(['SelfSessions Desktop', 'SelfSessions Mobile/1.0']);

    for (const item of sessions) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.issuedAt).toBe('string');
      expect(typeof item.lastAccessAt).toBe('string');
      expect(typeof item.expiresAt).toBe('string');
      expect(new Date(item.expiresAt).getTime()).toBeGreaterThan(new Date(item.issuedAt).getTime());
      expect(item).not.toHaveProperty('jti');
    }
    expect(JSON.stringify(sessions)).not.toContain('jti');
  });

  it('kills exactly the revoked own session: its refresh dies with UA-AUTH-009 and the sibling keeps refreshing', async () => {
    const register = registerBodies.get(revokedOneUser) as RegisterBody;
    await self('delete', `/auth/sessions/${register.sessionId}`, register.accessToken).expect(200);

    const one = await login(revokedOneUser, 'SelfRevoked Browser A');
    const two = await login(revokedOneUser, 'SelfRevoked Browser B');

    await self('delete', `/auth/sessions/${two.sessionId}`, one.accessToken).expect(200);
    expect(await self('get', '/auth/sessions', one.accessToken).expect(200).then((r) => (r.body as SessionItem[]).length)).toBe(1);

    const revoked = await exchangeRefresh(two.refreshToken);
    expect(revoked.status).toBe(401);
    expect(revoked.body.code).toBe('UA-AUTH-009');

    // La hermana sobrevive: el canje rota el jti, así que el token fresco se
    // captura y se vuelve a canjear para probar que la sesión sigue viva.
    const freshOne = await exchangeRefresh(one.refreshToken).expect(200);
    await exchangeRefresh((freshOne.body as AuthBody).refreshToken).expect(200);

    const revokedAgain = await exchangeRefresh(two.refreshToken);
    expect(revokedAgain.status).toBe(401);
    expect(revokedAgain.body.code).toBe('UA-AUTH-009');
  });

  it('revoking an unknown own session id returns 404 with UA-COM-002', async () => {
    const register = registerBodies.get(revokedOneUser) as RegisterBody;

    // Un uuid con forma válida que nunca existió: el 404 sale de la búsqueda
    // del registro, no del pipe de validación.
    const res = await self('delete', '/auth/sessions/00000000-0000-4000-8000-000000000000', register.accessToken).expect(404);
    expect(res.body.code).toBe('UA-COM-002');
  });

  it('lets a viewer without any admin role manage its own sessions end to end', async () => {
    const viewer = await login(viewerUser);

    const list = await self('get', '/auth/sessions', viewer.accessToken).expect(200);
    const sessions = list.body as SessionItem[];
    expect(sessions.length).toBeGreaterThanOrEqual(1);

    const target = sessions[0];
    await self('delete', `/auth/sessions/${target.id}`, viewer.accessToken).expect(200);

    const afterList = await self('get', '/auth/sessions', viewer.accessToken).expect(200);
    expect((afterList.body as SessionItem[]).some((item) => item.id === target.id)).toBe(false);
  });

  it('rejects unauthenticated requests with 401', async () => {
    await request(app.getHttpServer()).get('/auth/sessions').expect(401);
    await request(app.getHttpServer()).delete('/auth/sessions/00000000-0000-4000-8000-000000000000').expect(401);
  });
});
