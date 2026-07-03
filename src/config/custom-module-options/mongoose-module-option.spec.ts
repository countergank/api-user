import { ConfigService } from '@nestjs/config';
import { MongooseModuleOption } from './mongoose-module-option';

describe(MongooseModuleOption.name, () => {
  it('should build MongoDB URI with user and password', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          DATABASE_USER: 'testuser',
          DATABASE_PASSWORD: 'testpass',
          DATABASE_HOST: 'localhost',
          DATABASE_PORT: '27017',
          DATABASE_NAME: 'testdb',
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    const option = new MongooseModuleOption(configService);
    const result = option.createMongooseOptions();

    expect(result.uri).toBe('mongodb://testuser:testpass@localhost:27017/testdb');
  });

  it('should include credentials in URI for all configured values', () => {
    const configService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          DATABASE_USER: 'admin',
          DATABASE_PASSWORD: 's3cret!',
          DATABASE_HOST: 'mongo.example.com',
          DATABASE_PORT: '27018',
          DATABASE_NAME: 'production_db',
        };
        return config[key];
      }),
    } as unknown as ConfigService;

    const option = new MongooseModuleOption(configService);
    const result = option.createMongooseOptions();

    expect(result.uri).toContain('admin');
    expect(result.uri).toContain('s3cret!');
    expect(result.uri).toContain('mongo.example.com');
    expect(result.uri).toContain('27018');
    expect(result.uri).toContain('production_db');
    expect(result.uri).toBe('mongodb://admin:s3cret!@mongo.example.com:27018/production_db');
  });
});
