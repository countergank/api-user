import { Injectable, Logger } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { RedisService } from './redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const client = this.redisService.getClient();
      const pong = await client.ping();

      if (pong === 'PONG') {
        return this.getStatus(key, true, { message: 'Redis is responding' });
      }

      throw new Error('Unexpected ping response');
    } catch (error) {
      this.logger.error(`Redis health check failed: ${(error as Error).message}`);
      throw new HealthCheckError('Redis health check failed', (error as Error).message);
    }
  }
}
