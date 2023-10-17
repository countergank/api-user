import { Controller, Get, InternalServerErrorException, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { AppService } from './app.service';
import { CustomLogger } from './common/logger';
import { VersionNotFoundError } from './common/errors/version-not-found.error';

@Controller()
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version([VERSION_NEUTRAL, '1'])
  getVersion(): string {
    try {
      return this.appService.getVersionV1();
    } catch (error) {
      if (error instanceof VersionNotFoundError) {
        throw new InternalServerErrorException(error.fullMessage);
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }
}
