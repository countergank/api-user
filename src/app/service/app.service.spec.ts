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

    it('should throw DomainError if config returns empty values', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppService,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: () => '',
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
