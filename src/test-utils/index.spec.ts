import { startTestMongo } from './index';

/**
 * Covers COU-343 S2/S3 for the external-Mongo branch of the helper.
 * These specs only assert on the resolved values; they never connect to Mongo.
 */
describe('startTestMongo (MONGO_TEST_EXTERNAL=1)', () => {
  const MANAGED_KEYS = ['MONGO_TEST_EXTERNAL', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_HOST', 'DATABASE_PORT'];

  beforeEach(() => {
    process.env.MONGO_TEST_EXTERNAL = '1';
    process.env.DATABASE_USER = 'dev_user';
    process.env.DATABASE_PASSWORD = 'dev_password';
    process.env.DATABASE_HOST = 'localhost';
    process.env.DATABASE_PORT = '27017';
  });

  afterEach(() => {
    for (const key of MANAGED_KEYS) {
      delete process.env[key];
    }
  });

  const dbNameOf = (uri: string) => uri.split('?')[0].split('/').pop() as string;

  it('returns mongod null and a URI pointing at the external host/port with authSource=admin (S2)', async () => {
    const { uri, mongod } = await startTestMongo('audit-log-repository');

    expect(mongod).toBeNull();
    expect(uri).toContain('mongodb://dev_user:dev_password@localhost:27017/');
    expect(uri).toContain('authSource=admin');
    expect(uri).toContain('directConnection=true');
  });

  it('builds a unique database name per label so one suite dropDatabase() cannot hit another (S3)', async () => {
    const first = await startTestMongo('audit-log-repository');
    const second = await startTestMongo('user-repository');

    expect(first.mongod).toBeNull();
    expect(second.mongod).toBeNull();
    expect(dbNameOf(first.uri)).toContain('audit-log-repository');
    expect(dbNameOf(second.uri)).toContain('user-repository');
    expect(dbNameOf(first.uri)).not.toBe(dbNameOf(second.uri));
  });

  it('yields a fresh database name on every call, even for the same label (parallel-safe)', async () => {
    const first = await startTestMongo('audit-log-repository');
    const second = await startTestMongo('audit-log-repository');

    expect(dbNameOf(first.uri)).toContain(`_${process.pid}_`);
    expect(dbNameOf(first.uri)).not.toBe(dbNameOf(second.uri));
  });
});
