import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Model } from 'mongoose';
import request from 'supertest';
import { User, UserRole } from '../../../src/user/entities/user.entity';
import { createTestApp } from '../../helpers/create-test-app';

/**
 * La base de datos de e2e persiste entre specs: cada usuario sembrado usa un
 * `stamp` único y la búsqueda filtra por ese apellido para aislar el conjunto.
 */
describe('Admin users CSV export (#455, e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let regularToken: string;
  let userModel: Model<User>;

  const stamp = Date.now();
  const password = '3xportW0rd!x';
  const lastNameStamp = `Lst${stamp}`;
  const escapeSearch = `esc${stamp}`;

  const newUser = (prefix: string) => ({
    email: `${prefix}-${stamp}@example.com`,
    userName: `${prefix}-${stamp}`,
    password,
    name: prefix,
    lastName: lastNameStamp,
  });

  const adminCaller = newUser('adminx');
  const regularCaller = newUser('regularx');
  const listedAdmin = newUser('listedadmin');
  const listedA = newUser('listeda');
  const listedB = newUser('listedb');
  const listedC = newUser('listedc');
  const deactivatedUser = newUser('deactivated');
  const escapeUser = {
    ...newUser('escapee'),
    lastName: escapeSearch,
  };

  /** Registra un usuario, confirma su email y devuelve su id. */
  const registerAndVerify = async (user: ReturnType<typeof newUser>): Promise<string> => {
    const registerRes = await request(app.getHttpServer()).post('/auth/register').send(user).expect(201);
    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: registerRes.body.verificationToken })
      .expect(200);
    return (registerRes.body.user as { id: string }).id;
  };

  const login = async (user: ReturnType<typeof newUser>): Promise<string> => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    return loginRes.body.accessToken;
  };

  const getExport = (token: string, query = '') =>
    request(app.getHttpServer()).get(`/admin/users/export.csv${query}`).set('Authorization', `Bearer ${token}`);

  const rows = (text: string): string[] => text.split('\r\n').filter((line) => line.length > 0);

  beforeAll(async () => {
    app = await createTestApp();
    userModel = app.get<Model<User>>(getModelToken(User.name));

    const adminId = await registerAndVerify(adminCaller);
    await userModel.findByIdAndUpdate(adminId, { role: UserRole.ADMIN }).exec();
    adminToken = await login(adminCaller);

    await registerAndVerify(regularCaller);
    regularToken = await login(regularCaller);

    await registerAndVerify(listedA);
    await registerAndVerify(listedB);
    await registerAndVerify(listedC);
    const listedAdminId = await registerAndVerify(listedAdmin);
    await userModel.findByIdAndUpdate(listedAdminId, { role: UserRole.ADMIN }).exec();
    const deactivatedId = await registerAndVerify(deactivatedUser);
    await request(app.getHttpServer())
      .patch(`/admin/users/${deactivatedId}/active`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('responds 401 without a token', async () => {
    await request(app.getHttpServer()).get('/admin/users/export.csv').expect(401);
  });

  it('responds 403 for a non-admin user', async () => {
    await getExport(regularToken).expect(403);
  });

  it('applies search/role/isActive and returns the complete set ignoring page/limit', async () => {
    const res = await getExport(adminToken, `?search=${lastNameStamp}&limit=1&page=1`).expect(200);
    // Siete sembrados con ese apellido (incluidos los dos callers); `limit=1`
    // se ignora: vuelven los siete.
    expect(rows(res.text)).toHaveLength(8); // header + 7
    expect(rows(res.text)[0]).toContain('id,name,lastName,email,userName,role');
    expect(res.text).not.toContain(password);

    // Filtro por rol dentro del mismo conjunto: caller admin + listedadmin.
    const adminOnly = await getExport(adminToken, `?search=${lastNameStamp}&role=admin`).expect(200);
    const adminRows = rows(adminOnly.text);
    expect(adminRows).toHaveLength(3); // header + adminx + listedadmin
    expect(adminRows[1]).toContain(listedAdmin.email);

    // Filtro por estado: solo el desactivado.
    const inactiveOnly = await getExport(adminToken, `?search=${lastNameStamp}&isActive=false`).expect(200);
    const inactiveRows = rows(inactiveOnly.text);
    expect(inactiveRows).toHaveLength(2); // header + deactivated
    expect(inactiveRows[1]).toContain(deactivatedUser.email);

    const activeOnly = await getExport(adminToken, `?search=${lastNameStamp}&isActive=true`).expect(200);
    expect(rows(activeOnly.text)).toHaveLength(7); // header + 6 activos
  });

  it('emits the admin DTO header row and CSV headers for the download', async () => {
    const res = await getExport(adminToken, `?search=${lastNameStamp}`).expect(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toBe('attachment; filename="users.csv"');
    expect(rows(res.text)[0]).toBe(
      'id,name,lastName,email,userName,role,isActive,createdAt,updatedAt,lockedUntil,failedLoginAttempts',
    );
  });

  it('escapes a value with comma and quote per RFC 4180', async () => {
    const escapeId = await registerAndVerify(escapeUser);
    // El nombre con coma y comilla se escribe por el driver crudo: el DTO de
    // registro no lo aceptaría, y es exactamente el caso que hay que pinar.
    await userModel.collection.updateOne(
      { _id: new ObjectId(escapeId) },
      { $set: { name: 'Ana, "R"' } },
    );

    const res = await getExport(adminToken, `?search=${escapeSearch}`).expect(200);
    const csvRows = rows(res.text);
    expect(csvRows).toHaveLength(2); // header + escapeUser
    expect(csvRows[1]).toContain('"Ana, ""R"""');
  });
});
