import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppVersionNotFoundError } from '../errors/app-version-not-found.error';
import { AppService } from '../service/app.service';
import { AppController } from './app.controller';

describe(AppController.name, () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ConfigService],
    }).compile();

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

    it(`should return ${AppVersionNotFoundError.name}`, async () => {
      jest.spyOn(appService, 'getVersionV1').mockRejectedValueOnce(new AppVersionNotFoundError());
      await expect(controller.getVersion()).rejects.toThrow(InternalServerErrorException);
    });

    it(`should return ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(appService, 'getVersionV1').mockRejectedValueOnce(new InternalServerErrorException());
      await expect(controller.getVersion()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
