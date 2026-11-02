import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainError } from '../../common/errors/domain.error';
import { MicroservicesNames } from '../../config/custom-providers/microservices-names.enum';
import { VersionMock } from '../mocks/version.mock';
import { AppService } from './app.service';

describe(AppService.name, () => {
  let service: AppService;

  const mockConfig = {
    npm_package_name: 'User Manager',
    NODE_ENV: 'local',
    npm_package_version: '1.0.0',
    [`${MicroservicesNames.EXAMPLE}_MICROSERVICE_ENABLED`]: 'false',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (!(key in mockConfig)) {
                throw new Error(`Missing config key: ${key}`);
              }
              return mockConfig[key];
            },
            get: (key: string, defaultValue?: string) => {
              return mockConfig[key] ?? defaultValue;
            },
          },
        },
        {
          provide: MicroservicesNames.EXAMPLE,
          useValue: {} as ClientProxy,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`${AppService.prototype.getVersion.name}`, () => {
    it('should return API version', async () => {
      await expect(service.getVersion()).resolves.toEqual(new VersionMock());
    });

    it('should serve the same cached Version instance on every call (S2)', async () => {
      const first = await service.getVersion();
      const second = await service.getVersion();

      expect(second).toBe(first);
    });

    it('should warm the cache at startup so the first call is already served (S1)', async () => {
      await service.onApplicationBootstrap();

      const first = await service.getVersion();
      const second = await service.getVersion();

      expect(second).toBe(first);
    });

    it('should keep failing per call when config is invalid, without caching the failure', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppService,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: () => '',
              get: () => '',
            },
          },
          { provide: MicroservicesNames.EXAMPLE, useValue: {} as ClientProxy },
        ],
      }).compile();

      const serviceWithMissingConfig = module.get<AppService>(AppService);

      await expect(serviceWithMissingConfig.getVersion()).rejects.toBeInstanceOf(DomainError);
      await expect(serviceWithMissingConfig.getVersion()).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'APP_VERSION_NOT_FOUND' }),
      });
    });
  });

  describe(`${AppService.prototype.messageMicroservice.name}`, () => {
    it('should throw DomainError when microservice is disabled', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppService,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: (key: string) => {
                if (key.includes('_MICROSERVICE_ENABLED')) return 'false';
                throw new Error(`Missing config key: ${key}`);
              },
            },
          },
          { provide: MicroservicesNames.EXAMPLE, useValue: {} as ClientProxy },
        ],
      }).compile();

      const disabledService = module.get<AppService>(AppService);

      await expect(disabledService.messageMicroservice('pattern', {} as any)).rejects.toBeInstanceOf(DomainError);
      await expect(disabledService.messageMicroservice('pattern', {} as any)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'MICROSERVICE_UNAVAILABLE' }),
      });
    });
  });
});
