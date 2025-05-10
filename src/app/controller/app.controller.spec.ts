import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../../test/helpers';
import { ExampleMicroservice } from '../../config/custom-providers/microservices';
import { Version } from '../class/version.class';
import { VersionMock } from '../mocks/version.mock';
import { AppService } from '../service/app.service';
import { AppController } from './app.controller';
import { AppVersionNotFoundError } from '../errors/error-instances.error';

describe(AppController.name, () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, ConfigService, ExampleMicroservice],
    })
      .useMocker((token) => {
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
    it('should return API version', async () => {
      jest.spyOn(appService, 'getVersion').mockResolvedValue(new VersionMock());
      await expect(controller.getVersion()).resolves.toBeInstanceOf(Version);
    });

    it(`should return ${AppVersionNotFoundError.name}`, async () => {
      jest.spyOn(appService, 'getVersion').mockRejectedValueOnce(new AppVersionNotFoundError());
      await expect(controller.getVersion()).rejects.toThrow(BadRequestException);
    });

    it(`should return ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(appService, 'getVersion').mockRejectedValueOnce(new InternalServerErrorException());
      await expect(controller.getVersion()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
