/**
 * Verificación de COU-341: la purga de residuos de la suite Hurl borra sólo lo que la
 * suite crea de verdad, nunca un documento `hurl-*` ajeno creado a mano en la base de
 * desarrollo (S1), mientras los residuos de una corrida fallida siguen limpiándose (S2)
 * y la purga sigue siendo idempotente (S3).
 *
 * Usa la misma Mongo que la suite e2e —resuelta con test/helpers/test-env.js, igual que
 * test/global-setup.js—, sin hardcodear el nombre de la base. Siembra por inserción
 * directa los tres tipos de residuo que crea la suite (usuarios fixture de `HURL_USERS`,
 * el rol `hurl-role-temp` de role.hurl y la plantilla `hurl-template-temp` de
 * email-template.hurl) más documentos `hurl-*` ajenos, corre la purga y afirma: residuo
 * de la suite borrado, ajenos intactos, segunda corrida con el mismo resultado. Limpia
 * sus propios documentos ajenos en `afterAll`.
 */
import mongoose, { Connection, Model } from 'mongoose';
import { User, UserSchema } from '../../../src/user/entities/user.entity';
import { getTestMongoUri, loadTestEnv } from '../../helpers/test-env';
import { purgeHurlResidues } from './seed-hurl';

/** Emails fixture de la suite (subset literal de `HURL_USERS` en seed-hurl.ts). */
const SUITE_USER_EMAILS = ['hurl.flow@test.com', 'hurl.admin@test.com'] as const;

/** Rol que la suite crea de verdad (POST /roles en role.hurl). */
const SUITE_ROLE_NAME = 'hurl-role-temp';

/** Slug de plantilla que la suite crea de verdad (POST /email/templates en email-template.hurl). */
const SUITE_TEMPLATE_SLUG = 'hurl-template-temp';

/** Email ajeno a la suite que empieza con `hurl.`, como el que crearía una persona. */
const FOREIGN_USER_EMAIL = 'hurl.mine@dev.local';

/** Rol ajeno a la suite que empieza con `hurl-`. */
const FOREIGN_ROLE_NAME = 'hurl-my-role';

/** Slug ajeno a la suite que empieza con `hurl-`. */
const FOREIGN_TEMPLATE_SLUG = 'hurl-my-template';


describe('purga de residuos de la suite Hurl (COU-341)', () => {
  let connection: Connection;
  let userModel: Model<User>;

  beforeAll(async () => {
    loadTestEnv();
    connection = await mongoose.createConnection(getTestMongoUri()).asPromise();
    userModel = connection.model<User>(User.name, UserSchema);

    // Estado determinístico: borra por identificador exacto lo que este spec va a
    // insertar, por si una corrida previa interrumpida dejó algo atrás.
    await userModel
      .deleteMany({ email: { $in: [...SUITE_USER_EMAILS, FOREIGN_USER_EMAIL] } })
      .exec();
    await connection
      .collection('roles')
      .deleteMany({ name: { $in: [SUITE_ROLE_NAME, FOREIGN_ROLE_NAME] } });
    await connection
      .collection('emailtemplates')
      .deleteMany({ slug: { $in: [SUITE_TEMPLATE_SLUG, FOREIGN_TEMPLATE_SLUG] } });

    // Residuo real de la suite: los tres tipos de documento que crea una corrida.
    await connection.collection('users').insertMany([
      {
        email: SUITE_USER_EMAILS[0],
        userName: 'hurl-flow',
        name: 'Hurl',
        lastName: 'Fixture',
        role: 'user',
        permissions: [],
        isActive: true,
      },
      {
        email: SUITE_USER_EMAILS[1],
        userName: 'hurl-admin',
        name: 'Hurl',
        lastName: 'Admin',
        role: 'admin',
        permissions: [],
        isActive: true,
      },
      {
        email: FOREIGN_USER_EMAIL,
        userName: 'hurl-mine',
        name: 'Dev',
        lastName: 'Persona',
        role: 'user',
        permissions: [],
        isActive: true,
      },
    ]);
    await connection.collection('roles').insertMany([
      {
        name: SUITE_ROLE_NAME,
        description: 'rol temporal de role.hurl',
        permissionIds: [],
        isSystem: false,
        isDefault: false,
      },
      {
        name: FOREIGN_ROLE_NAME,
        description: 'rol creado a mano, ajeno a la suite',
        permissionIds: [],
        isSystem: false,
        isDefault: false,
      },
    ]);
    await connection.collection('emailtemplates').insertMany([
      {
        slug: SUITE_TEMPLATE_SLUG,
        name: 'Hurl template temp',
        subject: 'Hurl',
        content: 'Hurl',
        variables: [],
        isActive: true,
        version: 1,
      },
      {
        slug: FOREIGN_TEMPLATE_SLUG,
        name: 'My hand-made template',
        subject: 'Mine',
        content: 'Mine',
        variables: [],
        isActive: true,
        version: 1,
      },
    ]);
  });

  /**
   * Afirma a la vez S1 y S2: de todo lo que empieza con `hurl` sólo sobreviven los
   * documentos ajenos; el residuo de la suite (usuarios, rol y plantilla) fue borrado.
   */
  async function assertPurgeInvariants(): Promise<void> {
    const users = await connection.collection('users').find({ email: /^hurl/ }).toArray();
    expect(users.map((u) => u.email)).toEqual([FOREIGN_USER_EMAIL]);
    const roles = await connection.collection('roles').find({ name: /^hurl/ }).toArray();
    expect(roles.map((r) => r.name)).toEqual([FOREIGN_ROLE_NAME]);
    const templates = await connection.collection('emailtemplates').find({ slug: /^hurl/ }).toArray();
    expect(templates.map((t) => t.slug)).toEqual([FOREIGN_TEMPLATE_SLUG]);
  }

  it('borra el residuo de la suite y conserva los documentos hurl-* ajenos (S1, S2)', async () => {
    await purgeHurlResidues(connection, userModel);
    await assertPurgeInvariants();
  });

  it('es idempotente: una segunda corrida deja el mismo resultado (S3)', async () => {
    await purgeHurlResidues(connection, userModel);
    await assertPurgeInvariants();
  });

  afterAll(async () => {
    if (!connection) {
      return;
    }
    // Este spec limpia sus propios documentos ajenos para no ensuciar la base compartida.
    await connection.collection('users').deleteMany({ email: FOREIGN_USER_EMAIL });
    await connection.collection('roles').deleteMany({ name: FOREIGN_ROLE_NAME });
    await connection.collection('emailtemplates').deleteMany({ slug: FOREIGN_TEMPLATE_SLUG });
    await mongoose.disconnect();
  });
});
