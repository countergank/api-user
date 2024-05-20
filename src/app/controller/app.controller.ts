import { Controller, Get, InternalServerErrorException, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomLogger } from '../../common/logger';
import { GetVersionDoc } from '../../common/swagger/app.decorator';
import { AppVersionNotFoundError } from '../errors/app-version-not-found.error';
import { AppService } from '../service/app.service';

@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL, '1'] })
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @GetVersionDoc()
  @Get()
  async getVersion(): Promise<string> {
    try {
      return await this.appService.getVersionV1();
    } catch (error) {
      if (error instanceof AppVersionNotFoundError) {
        throw new InternalServerErrorException(error.fullMessage);
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }
}
