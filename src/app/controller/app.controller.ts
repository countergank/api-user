import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiHideProperty, ApiParam, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { Message } from '../../common/class/message.class';
import { RedisHealthIndicator } from '../../config/redis/redis-health.indicator';
import { GetVersionDoc, PostMessageMicroserviceDoc } from '../api-docs/app.decorator';
import { Version } from '../class/version.class';
import { AppService } from '../service/app.service';

/**
 * Controller raíz para información de la API.
 * Provee endpoints de health check y versión.
 * @public
 */
@ApiTags('Root')
@Controller({ version: [VERSION_NEUTRAL] })
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly healthCheckService: HealthCheckService,
    private readonly mongooseHealth: MongooseHealthIndicator,
    private readonly redisHealth: RedisHealthIndicator,
  ) {}

  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  async checkHealth() {
    return this.healthCheckService.check([
      () => this.mongooseHealth.pingCheck('database'),
      () => this.redisHealth.isHealthy('redis'),
    ]);
  }

  @GetVersionDoc()
  @Get()
  async getVersion(): Promise<Version> {
    return await this.appService.getVersion();
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
    return await this.appService.messageMicroservice(messagePattern, body);
  }
}
