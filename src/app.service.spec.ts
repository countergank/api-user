import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../test/helpers';
import { AppService } from './app.service';
import { VersionNotFoundError } from './common/errors/version-not-found.error';

describe(AppService.name, () => {
  let service: AppService;
  let configService: ConfigService;

  let VERSION = '0.0.1';
  let NODE_ENV = String(process.env.NODE_ENV);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService, ConfigService],
    })
      .useMocker((token) => {
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<AppService>(AppService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(`${AppService.name} should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`${AppService.name}.${AppService.prototype.getVersionV1.name}`, () => {
    it('should return API version', async () => {
      jest.spyOn(configService, 'getOrThrow').mockImplementation(() => VERSION);
      jest.spyOn(configService, 'getOrThrow').mockImplementation(() => NODE_ENV);
      await expect(service.getVersionV1()).not.toBeUndefined();
    });

    it(`should return ${VersionNotFoundError.name}`, async () => {
      VERSION = undefined;
      NODE_ENV = undefined;
      jest.spyOn(configService, 'getOrThrow').mockImplementation(() => VERSION);
      jest.spyOn(configService, 'getOrThrow').mockImplementation(() => NODE_ENV);
      await expect(service.getVersionV1()).rejects.toThrow(VersionNotFoundError);
    });
  });
});
