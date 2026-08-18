import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { MongooseHealthIndicator } from '@nestjs/terminus';
import { Mock } from '../../test-utils';
import { Version } from '../class/version.class';
import { VersionMock } from '../mocks/version.mock';
import { AppService } from '../service/app.service';
import { AppController } from './app.controller';

describe(AppController.name, () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const configMap: Record<string, any> = {
                EXAMPLE_MICROSERVICE_ENABLED: false,
                npm_package_name: 'test-package',
                NODE_ENV: 'test',
                npm_package_version: '1.0.0',
              };
              return configMap[key];
            },
            getOrThrow: (key: string) => {
              const configMap: Record<string, any> = {
                EXAMPLE_MICROSERVICE_ENABLED: false,
                npm_package_name: 'test-package',
                NODE_ENV: 'test',
                npm_package_version: '1.0.0',
              };
              if (!(key in configMap)) {
                throw new Error(`Configuration key "${key}" does not exist`);
              }
              return configMap[key];
            },
          },
        },
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              info: { database: { status: 'up' } },
              error: {},
              details: { database: { status: 'up' } },
            }),
          },
        },
        {
          provide: MongooseHealthIndicator,
          useValue: {
            pingCheck: jest.fn().mockResolvedValue({
              database: { status: 'up' },
            }),
          },
        },
      ],
    })
      .useMocker((token) => {
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<AppController>(AppController);
  });

  it(`${AppController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`${AppController.name}.checkHealth`, () => {
    it('should return health status with database ping', async () => {
      const result = await controller.checkHealth();
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('database');
    });
  });

  describe(`${AppController.name}.${AppController.prototype.getVersion.name}`, () => {
    it('should return API version', async () => {
      await expect(controller.getVersion()).resolves.toBeInstanceOf(Version);
    });
  });
});
