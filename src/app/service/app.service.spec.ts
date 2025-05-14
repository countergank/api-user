import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { MicroservicesNames } from '../../config/custom-providers/microservices-names.enum';
import { AppVersionNotFoundError } from '../errors/error-instances.error';
import { VersionMock } from '../mocks/version.mock';
import { AppService } from './app.service';

describe(AppService.name, () => {
  let service: AppService;
  let configService: ConfigService;

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
                throw new AppVersionNotFoundError();
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
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`${AppService.prototype.getVersion.name}`, () => {
    it('should return API version', async () => {
      await expect(service.getVersion()).resolves.toEqual(new VersionMock());
    });

    it('should throw AppVersionNotFoundError if required config is missing', async () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation((key: string) => {
        if (['npm_package_version', 'NODE_ENV', 'npm_package_name'].includes(key)) {
          throw new AppVersionNotFoundError();
        }
        return mockConfig[key];
      });
      const badConfigService = {
        getOrThrow: (key: string) => {
          if (key === 'npm_package_name' || key === 'NODE_ENV' || key === 'npm_package_version') {
            throw new AppVersionNotFoundError();
          }
          return mockConfig[key];
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppService,
          { provide: ConfigService, useValue: badConfigService },
          { provide: MicroservicesNames.EXAMPLE, useValue: {} as ClientProxy },
        ],
      }).compile();

      const serviceWithMissingConfig = module.get<AppService>(AppService);

      await expect(serviceWithMissingConfig.getVersion()).rejects.toBeInstanceOf(AppVersionNotFoundError);
    });
  });
});
