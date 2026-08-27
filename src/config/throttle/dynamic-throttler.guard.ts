import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
  ThrottlerOptions,
  ThrottlerGetTrackerFunction,
  ThrottlerGenerateKeyFunction,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
} from '@nestjs/throttler';
import { ParameterService } from '../parameters/parameter.service';

interface RouteThrottleConfig {
  limit: number;
  ttl: number;
}

@Injectable()
export class DynamicThrottlerGuard extends ThrottlerGuard {
  private readonly configMap = new Map<string, RouteThrottleConfig>();

  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly parameterService: ParameterService,
  ) {
    super(options, storageService, reflector);
  }

  async onModuleInit(): Promise<void> {
    await super.onModuleInit();
    await this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    const globalLimit = Number(await this.parameterService.get('THROTTLE_LIMIT'));
    const globalTtl = Number(await this.parameterService.get('THROTTLE_TTL'));

    this.configMap.set('global', { limit: globalLimit, ttl: globalTtl });
    this.configMap.set('login', {
      limit: Number(await this.parameterService.get('LOGIN_THROTTLE_LIMIT')),
      ttl: Number(await this.parameterService.get('LOGIN_THROTTLE_TTL')),
    });
    this.configMap.set('register', {
      limit: Number(await this.parameterService.get('REGISTER_THROTTLE_LIMIT')),
      ttl: Number(await this.parameterService.get('REGISTER_THROTTLE_TTL')),
    });
    this.configMap.set('forgot-password', {
      limit: Number(await this.parameterService.get('FORGOT_PASSWORD_THROTTLE_LIMIT')),
      ttl: Number(await this.parameterService.get('FORGOT_PASSWORD_THROTTLE_TTL')),
    });
  }

  async handleRequest(
    context: ExecutionContext,
    limit: number,
    ttl: number,
    throttler: ThrottlerOptions,
    getTracker: ThrottlerGetTrackerFunction,
    generateKey: ThrottlerGenerateKeyFunction,
  ): Promise<boolean> {
    const { req } = this.getRequestResponse(context);
    const url: string = req?.url || '';

    let routeKey = 'global';
    if (url.includes('/auth/login')) {
      routeKey = 'login';
    } else if (url.includes('/auth/register')) {
      routeKey = 'register';
    } else if (url.includes('/auth/forgot-password')) {
      routeKey = 'forgot-password';
    }

    const config = this.configMap.get(routeKey);
    return super.handleRequest(
      context,
      config?.limit ?? limit,
      config?.ttl ?? ttl,
      throttler,
      getTracker,
      generateKey,
    );
  }
}
