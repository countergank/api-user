import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Message } from '../../common/class/message.class';
import { CustomLogger } from '../../common/logger';
import { GetVersionDoc, PostMessageMicroserviceDoc } from '../api-docs/app.decorator';
import { Version } from '../class/version.class';
import { AppVersionNotFoundError } from '../errors/error-instances.error';
import { AppService } from '../service/app.service';

@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL] })
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @GetVersionDoc()
  @Get()
  async getVersion(): Promise<Version> {
    try {
      return await this.appService.getVersion();
    } catch (error) {
      if (error instanceof AppVersionNotFoundError) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }

  @PostMessageMicroserviceDoc()
  @Post('message-microservice/:message-pattern')
  async messageMicroservice(
    @Param('message-pattern') messagePattern: string,
    @Body() body: Message<any>,
  ): Promise<Message<any>> {
    try {
      return await this.appService.messageMicroservice(messagePattern, body);
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }
}
