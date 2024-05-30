import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModuleOption } from './custom-module-options/config-module-option';
import { MongooseModuleOption } from './custom-module-options/mongoose-module-option';

describe(ConfigService.name, () => {
  let configOptions: ConfigModuleOption;
  let mongooseModuleAsyncOptions: MongooseModuleOption;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigModuleOption,
        MongooseModuleOption,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn(() => false),
            get: jest.fn(() => false),
          },
        },
      ],
    }).compile();

    configOptions = module.get<ConfigModuleOption>(ConfigModuleOption);
    mongooseModuleAsyncOptions = module.get<MongooseModuleOption>(MongooseModuleOption);
  });

  describe(ConfigModuleOption.name, () => {
    it(`${ConfigModuleOption.name} should be defined`, () => {
      expect(configOptions).toBeDefined();
    });
  });

  describe(MongooseModuleOption.name, () => {
    it(`${MongooseModuleOption.name} should be defined`, () => {
      expect(mongooseModuleAsyncOptions).toBeDefined();
    });

    it(`${MongooseModuleOption.name}.${MongooseModuleOption.prototype.createMongooseOptions.name} should be defined`, () => {
      expect(mongooseModuleAsyncOptions.createMongooseOptions).toBeDefined();
    });
  });
});
