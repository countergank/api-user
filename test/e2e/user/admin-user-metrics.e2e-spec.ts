import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import request from 'supertest';
import { User, UserRole } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';

/**
 * La base de datos de e2e persiste entre specs (el global-setup solo siembra
 * permisos y roles), así que los valores absolutos de la colección no son
 * estables: el spec toma un baseline antes de sembrar y afirma deltas exactos,
 * asignando a cada usuario sembrado las facetas que debe mover y las que no.
 */
describe('Admin Users metrics (COU-348, e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let regularToken: string;
  let userModel: Model<User>;

  const stamp = Date.now();

  const password = 'M3tricsW0rd!x';

  const newUser = (prefix: string) => ({
    email: `${prefix}-${stamp}@example.com`,
    userName: `${prefix}-${stamp}`,
    password,
    name: 'Metrics',
    lastName: prefix,
  });

  const adminUser = newUser('admin-metrics');
  const regularUser = newUser('regular-metrics');
  const unverifiedUser = newUser('unverified-metrics');
  const lockedUser = newUser('locked-metrics');
  const inactiveUser = newUser('inactive-metrics');
  const previousWindowUser = newUser('previous-window-metrics');
  const softDeletedUser = newUser('soft-deleted-metrics');

  /** Registra un usuario y confirma su email; devuelve su id. */
  const registerAndVerify = async (user: ReturnType<typeof newUser>): Promise<string> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);
    return (registerRes.body.user as { id: string }).id;
  };

  /** Registra un usuario sin confirmar su email; devuelve su id. */
  const registerOnly = async (user: ReturnType<typeof newUser>): Promise<string> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);
    return (registerRes.body.user as { id: string }).id;
  };

  const login = async (user: ReturnType<typeof newUser>): Promise<string> => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    return loginRes.body.accessToken;
  };

  const getMetrics = (token: string) =>
    request(app.getHttpServer()).get('/admin/users/metrics').set('Authorization', `Bearer ${token}`);

  type Metrics = Record<string, number>;

  const readMetrics = async (token: string): Promise<Metrics> => {
    const res = await getMetrics(token).expect(200);
    return res.body;
  };

  beforeAll(async () => {
    app = await createTestApp();
    userModel = app.get<Model<User>>(getModelToken(User.name));

    const adminId = await registerAndVerify(adminUser);
    await userModel.findByIdAndUpdate(adminId, { role: UserRole.ADMIN }).exec();
    adminToken = await login(adminUser);

    // Usuario regular verificado: token para el 403 (user:read por rol, sin el rol admin).
    await registerAndVerify(regularUser);
    regularToken = await login(regularUser);
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 401 without a token', async () => {
    await request(app.getHttpServer()).get('/admin/users/metrics').expect(401);
  });

  it('responds 403 for a non-admin user', async () => {
    await getMetrics(regularToken).expect(403);
  });

  it('returns the six counts with exact deltas for each seeded state', async () => {
    const baseline = await readMetrics(adminToken);

    // Ventana anterior: hace 40 días, dentro de (30, 60]. El backdate va por el
    // driver crudo: con `timestamps: true`, findByIdAndUpdate no reescribe el
    // `createdAt` sembrado.
    const previousWindowId = await registerAndVerify(previousWindowUser);
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    await userModel.collection.updateOne(
      { _id: new ObjectId(previousWindowId) },
      {
        $set: { createdAt: fortyDaysAgo },
      },
    );

    // Bloqueado: activo y con `lockedUntil` en el futuro.
    const lockedId = await registerAndVerify(lockedUser);
    await userModel
      .findByIdAndUpdate(lockedId, {
        failedLoginAttempts: 5,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      })
      .exec();

    // Sin verificar: registro sin confirmar el email.
    await registerOnly(unverifiedUser);

    // Inactivo: verificado y desactivado por la misma acción del admin.
    const inactiveId = await registerAndVerify(inactiveUser);
    await request(app.getHttpServer())
      .patch(`/admin/users/${inactiveId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const seeded = await readMetrics(adminToken);

    // El baseline se toma después del `beforeAll`: admin y regular ya están
    // dentro de él. Aquí solo siembran unverified, locked, inactive y
    // previousWindow.
    expect(seeded.total - baseline.total).toBe(4); // unverified, locked, inactive, previousWindow
    expect(seeded.active - baseline.active).toBe(2); // locked, previousWindow
    expect(seeded.locked - baseline.locked).toBe(1); // locked
    expect(seeded.unverifiedEmail - baseline.unverifiedEmail).toBe(1); // unverified
    expect(seeded.newLast30Days - baseline.newLast30Days).toBe(3); // unverified, locked, inactive
    expect(seeded.newPrevious30Days - baseline.newPrevious30Days).toBe(1); // previousWindow
  });

  it('excludes soft-deleted users from every count', async () => {
    const before = await readMetrics(adminToken);

    const deletedId = await registerAndVerify(softDeletedUser);
    const afterSeed = await readMetrics(adminToken);
    expect(afterSeed.total - before.total).toBe(1);

    await request(app.getHttpServer())
      .delete(`/admin/users/${deletedId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const afterDelete = await readMetrics(adminToken);
    expect(afterDelete).toEqual(before);
  });

  it('returns exactly the six contract keys', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users/metrics')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(
      ['active', 'locked', 'newLast30Days', 'newPrevious30Days', 'total', 'unverifiedEmail'].sort(),
    );
  });
});
