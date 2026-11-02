import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiTags, ApiHideProperty, ApiParam, ApiOperation } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService, HealthCheckResult, MongooseHealthIndicator } from '@nestjs/terminus';
import { Message } from '../../common/class/message.class';
import { CacheService } from '../../config/cache/cache.service';
import { RedisHealthIndicator } from '../../config/redis/redis-health.indicator';
import { GetVersionDoc, PostMessageMicroserviceDoc } from '../api-docs/app.decorator';
import { Version } from '../class/version.class';
import { AppService } from '../service/app.service';

const HEALTH_CACHE_KEY = 'health:check';
const HEALTH_CACHE_TTL_MS = 15_000;

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
    private readonly cacheService: CacheService,
  ) {}

  @Get('health')
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint (result cached for 15s)' })
  async checkHealth() {
    const cached = await this.cacheService.get<HealthCheckResult>(HEALTH_CACHE_KEY);
    if (cached) {
      if (cached.status === 'error') {
        throw new ServiceUnavailableException(cached);
      }
      return cached;
    }

    try {
      const result = await this.healthCheckService.check([
        () => this.mongooseHealth.pingCheck('database'),
        () => this.redisHealth.isHealthy('redis'),
      ]);
      await this.cacheService.set(HEALTH_CACHE_KEY, result, HEALTH_CACHE_TTL_MS);
      return result;
    } catch (error) {
      // Cache the failure response too, so an outage does not turn every
      // load balancer probe into a fresh database round trip.
      if (error instanceof ServiceUnavailableException) {
        await this.cacheService.set(
          HEALTH_CACHE_KEY,
          error.getResponse() as HealthCheckResult,
          HEALTH_CACHE_TTL_MS,
        );
      }
      throw error;
    }
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
