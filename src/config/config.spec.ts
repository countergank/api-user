import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModuleOptions } from './ConfigModuleOptions';
import { MongooseModuleAsyncOptions } from './MongooseConfigService';

describe(ConfigService.name, () => {
  let configOptions: ConfigModuleOptions;
  let mongooseModuleAsyncOptions: MongooseModuleAsyncOptions;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigModuleOptions,
        MongooseModuleAsyncOptions,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => false),
            get: jest.fn(() => false),
          },
        },
      ],
    }).compile();

    configOptions = module.get<ConfigModuleOptions>(ConfigModuleOptions);
    mongooseModuleAsyncOptions = module.get<MongooseModuleAsyncOptions>(MongooseModuleAsyncOptions);
  });

  describe(ConfigModuleOptions.name, () => {
    it(`${ConfigModuleOptions.name} should be defined`, () => {
      expect(configOptions).toBeDefined();
    });
  });

  describe(MongooseModuleAsyncOptions.name, () => {
    it(`${MongooseModuleAsyncOptions.name} should be defined`, () => {
      expect(mongooseModuleAsyncOptions).toBeDefined();
    });

    it(`${MongooseModuleAsyncOptions.name}.${MongooseModuleAsyncOptions.prototype.createMongooseOptions.name} should be defined`, () => {
      expect(mongooseModuleAsyncOptions.createMongooseOptions).toBeDefined();
    });
  });
});
