import { Controller, Get, InternalServerErrorException, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { GetVersionDoc } from './common/decorators/swagger/app.decorator';
import { VersionNotFoundError } from './common/errors/version-not-found.error';
import { CustomLogger } from './common/logger';

@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL, '1'] })
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @GetVersionDoc()
  @Get()
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
