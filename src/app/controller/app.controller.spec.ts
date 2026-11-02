import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { CacheService } from '../../config/cache/cache.service';
import { Mock } from '../../test-utils';
import { Version } from '../class/version.class';
import { VersionMock } from '../mocks/version.mock';
import { AppService } from '../service/app.service';
import { AppController } from './app.controller';

describe(AppController.name, () => {
  let controller: AppController;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
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
          provide: CacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(undefined),
            set: jest.fn().mockResolvedValue(undefined),
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
    const HEALTHY_RESULT = {
      status: 'ok',
      info: { database: { status: 'up' }, redis: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' }, redis: { status: 'up' } },
    };
    const FAILED_RESULT = {
      status: 'error',
      info: {},
      error: { database: { status: 'down' } },
      details: { database: { status: 'down' }, redis: { status: 'up' } },
    };

    let cacheService: { get: jest.Mock; set: jest.Mock };
    let healthCheckService: { check: jest.Mock };

    beforeEach(() => {
      cacheService = module.get(CacheService);
      healthCheckService = module.get(HealthCheckService);
      jest.clearAllMocks();
    });

    it('should return health status with database ping on cache miss', async () => {
      const result = await controller.checkHealth();
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('database');
    });

    it('should serve a live cached result without re-running the checks (S2)', async () => {
      cacheService.get.mockResolvedValue(HEALTHY_RESULT);

      const result = await controller.checkHealth();

      expect(result).toEqual(HEALTHY_RESULT);
      expect(healthCheckService.check).not.toHaveBeenCalled();
    });

    it('should run the real checks and cache the result for 15s on cache miss (S3)', async () => {
      healthCheckService.check.mockResolvedValue(HEALTHY_RESULT);

      const result = await controller.checkHealth();

      expect(result).toEqual(HEALTHY_RESULT);
      expect(cacheService.set).toHaveBeenCalledTimes(1);
      const [key, value, ttlMs] = cacheService.set.mock.calls[0];
      expect(key).toBe('health:check');
      expect(value).toEqual(HEALTHY_RESULT);
      expect(ttlMs).toBe(15_000);
    });

    it('should reject with 503 from the cached result when the cache holds a failed check (S2)', async () => {
      cacheService.get.mockResolvedValue(FAILED_RESULT);

      await expect(controller.checkHealth()).rejects.toThrow(ServiceUnavailableException);
      await expect(controller.checkHealth()).rejects.toMatchObject({
        response: FAILED_RESULT,
      });
      expect(healthCheckService.check).not.toHaveBeenCalled();
    });

    it('should cache a failed check result and rethrow it (S3)', async () => {
      const failure = new ServiceUnavailableException(FAILED_RESULT);
      healthCheckService.check.mockRejectedValue(failure);

      await expect(controller.checkHealth()).rejects.toBe(failure);
      expect(cacheService.set).toHaveBeenCalledTimes(1);
      const [key, value, ttlMs] = cacheService.set.mock.calls[0];
      expect(key).toBe('health:check');
      expect(value).toEqual(FAILED_RESULT);
      expect(ttlMs).toBe(15_000);
    });
  });

  describe(`${AppController.name}.${AppController.prototype.getVersion.name}`, () => {
    it('should return API version', async () => {
      await expect(controller.getVersion()).resolves.toBeInstanceOf(Version);
    });
  });
});
