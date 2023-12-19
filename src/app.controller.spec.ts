import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../test/helpers';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VersionNotFoundError } from './common/errors/version-not-found.error';

describe(AppController.name, () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    })
      .useMocker((token) => {
        if (token === AppService) {
          return appService;
        }
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  it(`${AppController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`${AppController.name}.${AppController.prototype.getVersion.name}`, () => {
    const version = 'User Manager API v=local-0.0.1';

    it('should return API version', async () => {
      jest.spyOn(appService, 'getVersionV1').mockResolvedValue(version);
      await expect(controller.getVersion()).not.toBeUndefined();
    });

    it(`should return ${VersionNotFoundError.name}`, async () => {
      jest.spyOn(appService, 'getVersionV1').mockRejectedValueOnce(new VersionNotFoundError());
      await expect(controller.getVersion()).rejects.toThrow(InternalServerErrorException);
    });

    it(`should return ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(appService, 'getVersionV1').mockRejectedValueOnce(new InternalServerErrorException());
      await expect(controller.getVersion()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
