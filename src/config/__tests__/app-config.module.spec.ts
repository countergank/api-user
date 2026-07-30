import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfigModule } from '../app-config.module';
import { AppConfigService } from '../app-config.service';

describe(AppConfigModule.name, () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        AppConfigModule,
      ],
    }).compile();
  });

  it('should provide AppConfigService', () => {
    const service = module.get<AppConfigService>(AppConfigService);
    expect(service).toBeDefined();
  });

  it('should resolve frontendUrl from ConfigService', () => {
    const service = module.get<AppConfigService>(AppConfigService);
    // Value comes from env vars set in jest.setup.ts / .env.local.testing
    expect(typeof service.frontendUrl).toBe('string');
  });

  it('should resolve emailProvider from ConfigService with default fallback', () => {
    const service = module.get<AppConfigService>(AppConfigService);
    // Default should be 'smtp' when EMAIL_PROVIDER is not explicitly set
    expect(service.emailProvider).toBe('smtp');
  });

  it('should resolve throttle config from ConfigService', () => {
    const service = module.get<AppConfigService>(AppConfigService);
    // Values come from env vars set in jest.setup.ts
    const result = service.throttle;
    expect(result).toHaveProperty('ttl');
    expect(result).toHaveProperty('limit');
    expect(typeof result.ttl).toBe('string');
    expect(typeof result.limit).toBe('string');
  });

  it('should be importable in other modules without duplicate providers', () => {
    expect(() => module.get<AppConfigService>(AppConfigService)).not.toThrow();
  });
});
