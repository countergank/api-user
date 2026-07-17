import { ConfigService } from '@nestjs/config';
import { MongooseModuleOption } from './mongoose-module-option';

describe(MongooseModuleOption.name, () => {
  const originalJestWorkerId = process.env.JEST_WORKER_ID;

  afterEach(() => {
    // Restore JEST_WORKER_ID so one test's env mutation cannot leak into siblings
    if (originalJestWorkerId === undefined) {
      delete process.env.JEST_WORKER_ID;
    } else {
      process.env.JEST_WORKER_ID = originalJestWorkerId;
    }
  });

  const buildConfigService = (config: Record<string, string>): ConfigService =>
    ({
      getOrThrow: jest.fn((key: string) => config[key]),
      get: jest.fn((key: string, defaultValue?: string) => {
        if (key === 'DATABASE_REPLICA_SET') return defaultValue ?? 'rs0';
        return undefined;
      }),
    }) as unknown as ConfigService;

  describe('production/dev mode (no JEST_WORKER_ID)', () => {
    beforeEach(() => {
      delete process.env.JEST_WORKER_ID;
    });

    it('should build MongoDB URI with replicaSet when not under Jest', () => {
      const configService = buildConfigService({
        DATABASE_USER: 'testuser',
        DATABASE_PASSWORD: 'testpass',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '27017',
        DATABASE_NAME: 'testdb',
      });

      const option = new MongooseModuleOption(configService);
      const result = option.createMongooseOptions();

      expect(result.uri).toBe(
        'mongodb://testuser:testpass@localhost:27017/testdb?authSource=admin&replicaSet=rs0',
      );
    });

    it('should include credentials and replicaSet in URI for all configured values', () => {
      const configService = buildConfigService({
        DATABASE_USER: 'admin',
        DATABASE_PASSWORD: 's3cret!',
        DATABASE_HOST: 'mongo.example.com',
        DATABASE_PORT: '27018',
        DATABASE_NAME: 'production_db',
      });

      const option = new MongooseModuleOption(configService);
      const result = option.createMongooseOptions();

      expect(result.uri).toBe(
        'mongodb://admin:s3cret!@mongo.example.com:27018/production_db?authSource=admin&replicaSet=rs0',
      );
    });
  });

  describe('test mode (JEST_WORKER_ID set)', () => {
    beforeEach(() => {
      process.env.JEST_WORKER_ID = '1';
    });

    it('should use directConnection instead of replicaSet under Jest', () => {
      const configService = buildConfigService({
        DATABASE_USER: 'dev_user',
        DATABASE_PASSWORD: 'dev_password',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '27017',
        DATABASE_NAME: 'api_user_test',
      });

      const option = new MongooseModuleOption(configService);
      const result = option.createMongooseOptions();

      expect(result.uri).toBe(
        'mongodb://dev_user:dev_password@localhost:27017/api_user_test?authSource=admin&directConnection=true',
      );
      expect(result.uri).not.toContain('replicaSet');
    });

    it('should still include credentials in directConnection mode', () => {
      const configService = buildConfigService({
        DATABASE_USER: 'admin',
        DATABASE_PASSWORD: 's3cret!',
        DATABASE_HOST: 'mongo.example.com',
        DATABASE_PORT: '27018',
        DATABASE_NAME: 'production_db',
      });

      const option = new MongooseModuleOption(configService);
      const result = option.createMongooseOptions();

      expect(result.uri).toContain('admin');
      expect(result.uri).toContain('s3cret!');
      expect(result.uri).toContain('directConnection=true');
      expect(result.uri).not.toContain('replicaSet');
    });
  });
});