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
import { ApiTags, ApiHideProperty, ApiParam, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { MongooseHealthIndicator } from '@nestjs/terminus';
import { Message } from '../../common/class/message.class';
import { CustomLogger } from '../../common/logger';
import { GetVersionDoc, PostMessageMicroserviceDoc } from '../api-docs/app.decorator';
import { Version } from '../class/version.class';
import { AppVersionNotFoundError } from '../errors/error-instances.error';
import { AppService } from '../service/app.service';

/**
 * Controller raíz para información de la API.
 * Provee endpoints de health check y versión.
 * @public
 */
@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL] })
export class AppController {
  private readonly logger = new CustomLogger(AppController.name);
  constructor(
    private readonly appService: AppService,
    private readonly healthCheckService: HealthCheckService,
    private readonly mongooseHealth: MongooseHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  async checkHealth() {
    return this.healthCheckService.check([
      () => this.mongooseHealth.pingCheck('database'),
    ]);
  }

  @GetVersionDoc()
  @Get()
  async getVersion(): Promise<Version> {
    try {
      return await this.appService.getVersion();
    } catch (error) {
      if (error instanceof AppVersionNotFoundError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @PostMessageMicroserviceDoc()
  @Post('message-microservice/:message-pattern')
  @ApiHideProperty()
  @ApiParam({
    name: 'message-pattern',
    description: 'Patrón del mensaje (ej: user-created, order-completed)',
    example: 'user-created',
  })
  async messageMicroservice(
    @Param('message-pattern') messagePattern: string,
    @Body() body: Message<any>,
  ): Promise<Message<any>> {
    try {
      return await this.appService.messageMicroservice(messagePattern, body);
    } catch (error) {
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }
}
