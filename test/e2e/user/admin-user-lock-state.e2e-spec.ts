import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createTestApp } from '../../helpers/create-test-app';
import { User, UserRole } from '../../../src/user/entities/user.entity';

/**
 * COU-261 — El estado de bloqueo de la cuenta se expone en las respuestas de
 * administración (S3) y no aparece en las respuestas self ni públicas (S4).
 *
 * La cuenta objetivo queda bloqueada y el bloqueo se prueba con el síntoma que
 * ve el cliente: `POST /auth/login` responde `423 UA-AUTH-003` (S6).
 *
 * El estado se siembra en la base en vez de llegar a él con intentos fallidos
 * porque el umbral es configurable y CI lo eleva a `MAX_LOGIN_ATTEMPTS: 100`
 * (`.github/workflows/test.yml`) para que las suites no se bloqueen entre sí:
 * un ritual de cinco intentos no bloquea nada en CI.
 */
describe('Admin Users lock state (COU-261, e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const stamp = Date.now();

  const adminUser = {
    email: `admin-lock-${stamp}@example.com`,
    userName: `admin-lock-${stamp}`,
    password: 'Adm1nW0rd!x',
    name: 'Admin',
    lastName: 'Lock',
  };

  const lockedUser = {
    email: `locked-${stamp}@example.com`,
    userName: `locked-${stamp}`,
    password: 'L0ckedW0rd!x',
    name: 'Locked',
    lastName: 'Account',
  };

  const healthyUser = {
    email: `healthy-${stamp}@example.com`,
    userName: `healthy-${stamp}`,
    password: 'H3althyW0rd!x',
    name: 'Healthy',
    lastName: 'Account',
  };

  let lockedUserId: string;
  let healthyUserId: string;
  let healthyToken: string;
  let lockedRegisterBody: Record<string, unknown>;

  /** Registra un usuario y confirma su email; devuelve el body del alta. */
  const registerAndVerify = async (user: typeof adminUser): Promise<Record<string, unknown>> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);

    return registerRes.body;
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Admin: alta, verificación, promoción por base y login con el JWT nuevo.
    const adminRegisterBody = await registerAndVerify(adminUser);
    const adminId = (adminRegisterBody.user as { id: string }).id;

    const userModel = app.get<Model<User>>(getModelToken(User.name));
    await userModel.findByIdAndUpdate(adminId, { role: UserRole.ADMIN }).exec();

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminUser.email, password: adminUser.password })
      .expect(200);
    adminToken = adminLogin.body.accessToken;

    // Cuenta que se va a bloquear.
    lockedRegisterBody = await registerAndVerify(lockedUser);
    lockedUserId = (lockedRegisterBody.user as { id: string }).id;

    // Cuenta sana: prueba que `lockedUntil=null` y `failedLoginAttempts=0` se
    // reportan explícitos, y aporta el token para la respuesta self.
    const healthyRegisterBody = await registerAndVerify(healthyUser);
    healthyUserId = (healthyRegisterBody.user as { id: string }).id;

    const healthyLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: healthyUser.email, password: healthyUser.password })
      .expect(200);
    healthyToken = healthyLogin.body.accessToken;

    // Bloqueo real de la cuenta objetivo. `MAX_LOGIN_ATTEMPTS` es configurable y
    // CI lo sube a 100, así que el estado se siembra; lo que se verifica a
    // continuación es que la aplicación lo trata como bloqueado.
    await userModel
      .findByIdAndUpdate(lockedUserId, {
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      })
      .exec();

    // La cuenta está bloqueada: la contraseña correcta ya no entra.
    const blocked = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: lockedUser.email, password: lockedUser.password })
      .expect(423);
    expect(blocked.body.code).toBe('UA-AUTH-003');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('S3 — admin responses expose the lock state', () => {
    it('GET /admin/users/:id exposes lockedUntil and failedLoginAttempts', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${lockedUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.failedLoginAttempts).toBe(5);
      expect(typeof res.body.lockedUntil).toBe('string');
      expect(new Date(res.body.lockedUntil).getTime()).toBeGreaterThan(Date.now());
    });

    it('GET /admin/users?page=1 exposes the lock state in the paginated envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ page: 1, limit: 10, search: lockedUser.email })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const target = (res.body.data as Array<Record<string, unknown>>).find(
        (item) => (item.id ?? item._id) === lockedUserId,
      );
      expect(target).toBeDefined();
      expect(target?.failedLoginAttempts).toBe(5);
      expect(typeof target?.lockedUntil).toBe('string');
    });

    it('GET /admin/users without an explicit page exposes the lock state in the default envelope', async () => {
      // El `ValidationPipe` instancia `PaginationQueryDTO` y aplica su default
      // `page=1`: sin `page` la respuesta es el envelope, nunca el array plano
      // (la rama "backward compat" del controller es inalcanzable por HTTP;
      // ver `admin-crud-pagination.e2e-spec.ts:309` y el ticket COU-260).
      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .query({ search: lockedUser.email })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      const target = (res.body.data as Array<Record<string, unknown>>).find(
        (item) => (item.id ?? item._id) === lockedUserId,
      );
      expect(target).toBeDefined();
      expect(target?.failedLoginAttempts).toBe(5);
      expect(typeof target?.lockedUntil).toBe('string');
    });

    it('GET /admin/users/:id reports a never-locked account as null and 0', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/users/${healthyUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.lockedUntil).toBeNull();
      expect(res.body.failedLoginAttempts).toBe(0);
    });
  });

  describe('S7 — the lock state is read-only for clients', () => {
    it('PATCH /admin/users/:id rejects lockedUntil in the body and keeps the state', async () => {
      // `ValidationPipe` corre con `whitelist` + `forbidNonWhitelisted`: la
      // propiedad no existe en `UpdateUserDTO`, así que el body se rechaza.
      await request(app.getHttpServer())
        .patch(`/admin/users/${lockedUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lockedUntil: null, failedLoginAttempts: 0 })
        .expect(400);

      const res = await request(app.getHttpServer())
        .get(`/admin/users/${lockedUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.failedLoginAttempts).toBe(5);
      expect(new Date(res.body.lockedUntil).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('S4 — self and public responses do not expose the lock state', () => {
    it('GET /users/profile does not include lockedUntil or failedLoginAttempts', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${healthyToken}`)
        .expect(200);

      expect(res.body).not.toHaveProperty('lockedUntil');
      expect(res.body).not.toHaveProperty('failedLoginAttempts');
    });

    it('POST /auth/register does not include lockedUntil or failedLoginAttempts', () => {
      expect(lockedRegisterBody).not.toHaveProperty('lockedUntil');
      expect(lockedRegisterBody).not.toHaveProperty('failedLoginAttempts');

      const registered = lockedRegisterBody.user as Record<string, unknown>;
      expect(registered).not.toHaveProperty('lockedUntil');
      expect(registered).not.toHaveProperty('failedLoginAttempts');
    });
  });
});
