import { Reflector } from '@nestjs/core';
import {
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { DynamicThrottlerGuard } from '../dynamic-throttler.guard';
import { ParameterService } from '../../parameters/parameter.service';

describe('DynamicThrottlerGuard', () => {
  let guard: DynamicThrottlerGuard;
  let mockParameterService: jest.Mocked<Pick<ParameterService, 'get'>>;

  const mockStorage: ThrottlerStorage = {
    increment: jest.fn().mockResolvedValue({ totalHits: 1, timeToExpire: 60 }),
  };

  const mockOptions: ThrottlerModuleOptions = {
    throttlers: [{ limit: 10, ttl: 60 }],
  };

  beforeEach(() => {
    mockParameterService = {
      get: jest.fn(),
    };
  });

  const createGuard = async () => {
    guard = new DynamicThrottlerGuard(
      mockOptions as ThrottlerModuleOptions,
      mockStorage,
      new Reflector(),
      mockParameterService as unknown as ParameterService,
    );
    await guard.onModuleInit();
  };

  it('should be defined', async () => {
    await createGuard();
    expect(guard).toBeDefined();
  });

  it('should load config from parameterService on init', async () => {
    mockParameterService.get.mockImplementation(async (key: string) => {
      const values: Record<string, number> = {
        THROTTLE_LIMIT: 20,
        THROTTLE_TTL: 30,
        LOGIN_THROTTLE_LIMIT: 5,
        LOGIN_THROTTLE_TTL: 60,
        REGISTER_THROTTLE_LIMIT: 3,
        REGISTER_THROTTLE_TTL: 60,
        FORGOT_PASSWORD_THROTTLE_LIMIT: 3,
        FORGOT_PASSWORD_THROTTLE_TTL: 300,
      };
      return values[key];
    });

    await createGuard();

    // Should have called parameterService for each throttle param
    expect(mockParameterService.get).toHaveBeenCalledWith('THROTTLE_LIMIT');
    expect(mockParameterService.get).toHaveBeenCalledWith('THROTTLE_TTL');
    expect(mockParameterService.get).toHaveBeenCalledWith('LOGIN_THROTTLE_LIMIT');
    expect(mockParameterService.get).toHaveBeenCalledWith('LOGIN_THROTTLE_TTL');
    expect(mockParameterService.get).toHaveBeenCalledWith('REGISTER_THROTTLE_LIMIT');
    expect(mockParameterService.get).toHaveBeenCalledWith('REGISTER_THROTTLE_TTL');
    expect(mockParameterService.get).toHaveBeenCalledWith('FORGOT_PASSWORD_THROTTLE_LIMIT');
    expect(mockParameterService.get).toHaveBeenCalledWith('FORGOT_PASSWORD_THROTTLE_TTL');
  });
});
