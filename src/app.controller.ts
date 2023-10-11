import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { AppService } from './app.service';
import { CustomLogger } from './common/logger';

@Controller()
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Get()
  getVersion(): string {
    try {
      return this.appService.getVersion();
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }
}
