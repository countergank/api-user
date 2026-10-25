import { Test, TestingModule } from '@nestjs/testing';
import { ParameterStore, PARAMETER_CHANGED_EVENT } from '../parameter.store';
import { RedisService } from '../../redis/redis.service';
import { ParameterRegistry } from '../parameter-registry';
import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';

describe(ParameterStore.name, () => {
  let store: ParameterStore;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRegistry = {
    getDefault: jest.fn(),
    getTTL: jest.fn(),
    has: jest.fn(),
    findByKey: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRegistry.getDefault.mockReturnValue(undefined);
    mockRegistry.getTTL.mockReturnValue(300);
    mockRegistry.has.mockReturnValue(true);
    mockRegistry.findByKey.mockReturnValue(undefined);
    mockConfigService.get.mockReturnValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParameterStore,
        { provide: RedisService, useValue: mockRedisService },
        { provide: ParameterRegistry, useValue: mockRegistry },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    store = module.get<ParameterStore>(ParameterStore);
  });

  it('should be defined', () => {
    expect(store).toBeDefined();
  });

  describe('env var override', () => {
    it('should return env var value when set, ignoring Redis and registry default', async () => {
      mockConfigService.get.mockReturnValue('resend');
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue('smtp');

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('resend');
      expect(mockConfigService.get).toHaveBeenCalledWith('EMAIL_PROVIDER');
      // Should NOT read from Redis when env var is set
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should cache env var value in L1 for subsequent reads', async () => {
      mockConfigService.get.mockReturnValue('resend');

      await store.get('EMAIL_PROVIDER');
      mockConfigService.get.mockClear();
      mockRedisService.get.mockClear();

      // Second call should use L1 cache, not ConfigService or Redis
      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('resend');
      expect(mockConfigService.get).not.toHaveBeenCalled();
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should fall through to Redis when env var is undefined', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue('sendgrid');

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('sendgrid');
      expect(mockRedisService.get).toHaveBeenCalledWith('param:EMAIL_PROVIDER');
    });
  });

  describe('env override coercion (COU-327)', () => {
    const def = (type: string) => ({ key: 'X', type, default: undefined, group: 'g', ttl: 300 });

    it('S1: coerces EMAIL_SECURE=false to boolean false', async () => {
      mockRegistry.findByKey.mockReturnValue(def('boolean'));
      mockConfigService.get.mockReturnValue('false');

      const result = await store.get('EMAIL_SECURE');

      expect(result).toBe(false);
    });

    it('S2: coerces THROTTLE_TTL=60 to number 60', async () => {
      mockRegistry.findByKey.mockReturnValue(def('number'));
      mockConfigService.get.mockReturnValue('60');

      const result = await store.get('THROTTLE_TTL');

      expect(result).toBe(60);
      expect(typeof result).toBe('number');
    });

    it('S2: returns EMAIL_HOST=127.0.0.1 as-is for string type', async () => {
      mockRegistry.findByKey.mockReturnValue(def('string'));
      mockConfigService.get.mockReturnValue('127.0.0.1');

      const result = await store.get('EMAIL_HOST');

      expect(result).toBe('127.0.0.1');
    });

    it('throws explicitly on a non-convertible number override instead of returning NaN', async () => {
      mockRegistry.findByKey.mockReturnValue(def('number'));
      mockConfigService.get.mockReturnValue('abc');

      await expect(store.get('THROTTLE_TTL')).rejects.toThrow(/THROTTLE_TTL/);
    });

    it('caches the converted value in L1 so both gets return the same type', async () => {
      mockRegistry.findByKey.mockReturnValue(def('number'));
      mockConfigService.get.mockReturnValue('60');

      const first = await store.get('THROTTLE_TTL');
      mockConfigService.get.mockClear();
      const second = await store.get('THROTTLE_TTL');

      expect(first).toBe(60);
      expect(second).toBe(60);
      expect(typeof second).toBe('number');
      expect(mockConfigService.get).not.toHaveBeenCalled();
    });

    it('accepts boolean variants true/false/1/0/si/no case-insensitive', async () => {
      mockRegistry.findByKey.mockReturnValue(def('boolean'));
      const cases: Array<[string, boolean]> = [
        ['true', true],
        ['TRUE', true],
        ['1', true],
        ['Si', true],
        ['false', false],
        ['FALSE', false],
        ['0', false],
        ['NO', false],
      ];
      for (const [envValue, expected] of cases) {
        store = await Test.createTestingModule({
          providers: [
            ParameterStore,
            { provide: RedisService, useValue: mockRedisService },
            { provide: ParameterRegistry, useValue: mockRegistry },
            { provide: EventEmitter2, useValue: mockEventEmitter },
            { provide: ConfigService, useValue: mockConfigService },
          ],
        }).compile().then((m) => m.get(ParameterStore));
        mockConfigService.get.mockReturnValue(envValue);
        const result = await store.get('EMAIL_SECURE');
        expect(result).toBe(expected);
      }
    });

    it('throws on an unrecognized boolean override', async () => {
      mockRegistry.findByKey.mockReturnValue(def('boolean'));
      mockConfigService.get.mockReturnValue('maybe');

      await expect(store.get('EMAIL_SECURE')).rejects.toThrow(/EMAIL_SECURE/);
    });
  });

  describe(`${ParameterStore.name}.get`, () => {
    it('should return registry default when both L1 and Redis are empty', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue(null);

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('smtp');
      expect(mockRedisService.get).toHaveBeenCalledWith('param:EMAIL_PROVIDER');
      // Should seed Redis with default value
      expect(mockRedisService.set).toHaveBeenCalledWith('param:EMAIL_PROVIDER', 'smtp', 300);
    });

    it('should return Redis value when L1 misses but Redis has value', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue('sendgrid');

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('sendgrid');
      expect(mockRedisService.get).toHaveBeenCalledWith('param:EMAIL_PROVIDER');
      // Should NOT overwrite Redis with default
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });

    it('should populate L1 cache after Redis hit', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue('sendgrid');

      await store.get('EMAIL_PROVIDER');
      // Second call should not call Redis
      mockRedisService.get.mockClear();
      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('sendgrid');
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should return L1 cached value without calling Redis', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue('sendgrid');

      // Seed L1 cache
      await store.get('EMAIL_PROVIDER');
      mockRedisService.get.mockClear();

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('sendgrid');
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should expire L1 cache after TTL and re-fetch from Redis', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(1); // 1 second TTL
      mockRedisService.get.mockResolvedValue('sendgrid');

      // Seed L1 cache
      await store.get('EMAIL_PROVIDER');
      // Simulate time passing (2 seconds)
      const realDateNow = Date.now;
      Date.now = jest.fn(() => realDateNow() + 2000);
      mockRedisService.get.mockResolvedValue('sendgrid');

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('sendgrid');
      expect(mockRedisService.get).toHaveBeenCalled();
      Date.now = realDateNow;
    });

    it('should log warning and return default when Redis fails', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockRejectedValue(new Error('Redis down'));

      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const result = await store.get('EMAIL_PROVIDER');

      expect(result).toBe('smtp');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis read failed'),
      );
      loggerSpy.mockRestore();
    });

    it('should return Redis value after Redis recovers from failure', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      // First call fails
      mockRedisService.get.mockRejectedValueOnce(new Error('Redis down'));
      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      const firstResult = await store.get('EMAIL_PROVIDER');
      expect(firstResult).toBe('smtp');
      // Second call succeeds (Redis recovers)
      mockRedisService.get.mockResolvedValue('sendgrid');
      const secondResult = await store.get('EMAIL_PROVIDER');
      expect(secondResult).toBe('sendgrid');
      loggerSpy.mockRestore();
    });
  });

  describe(`${ParameterStore.name}.set`, () => {
    it('should update Redis and invalidate L1 cache', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(300);
      mockRedisService.get.mockResolvedValue('smtp');
      mockRedisService.set.mockResolvedValue(undefined);

      // Seed L1
      await store.get('EMAIL_PROVIDER');
      // Now set
      await store.set('EMAIL_PROVIDER', 'sendgrid');

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'param:EMAIL_PROVIDER',
        'sendgrid',
        300,
      );
      // L1 should be invalidated, next get should call Redis
      mockRedisService.get.mockResolvedValue('sendgrid');
      mockRedisService.get.mockClear();
      await store.get('EMAIL_PROVIDER');
      expect(mockRedisService.get).toHaveBeenCalled();
    });

    it('should not throw when Redis write fails', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(300);
      mockRedisService.set.mockRejectedValue(new Error('Redis write failed'));

      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await expect(store.set('EMAIL_PROVIDER', 'sendgrid')).resolves.not.toThrow();

      loggerSpy.mockRestore();
    });

    it('should log warning when Redis write fails', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(300);
      mockRedisService.set.mockRejectedValue(new Error('Redis write failed'));

      const loggerSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await store.set('EMAIL_PROVIDER', 'sendgrid');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis write failed'),
      );
      loggerSpy.mockRestore();
    });

    it('should update L1 cache locally when Redis write fails', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(300);
      mockRedisService.set.mockRejectedValue(new Error('Redis write failed'));
      mockRedisService.get.mockResolvedValue('smtp');

      // Seed L1 with default
      await store.get('EMAIL_PROVIDER');
      // Attempt to set new value (Redis fails)
      await store.set('EMAIL_PROVIDER', 'sendgrid');
      // Next get should return the new value from L1 (not from Redis)
      mockRedisService.get.mockClear();
      const result = await store.get('EMAIL_PROVIDER');
      expect(result).toBe('sendgrid');
      expect(mockRedisService.get).not.toHaveBeenCalled();
    });

    it('should emit change event on successful set', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(300);
      mockRedisService.set.mockResolvedValue(undefined);

      await store.set('EMAIL_PROVIDER', 'sendgrid');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(PARAMETER_CHANGED_EVENT, {
        key: 'EMAIL_PROVIDER',
        value: 'sendgrid',
      });
    });

    it('should emit change event on set when Redis fails', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRegistry.getTTL.mockReturnValue(300);
      mockRedisService.set.mockRejectedValue(new Error('Redis write failed'));

      await store.set('EMAIL_PROVIDER', 'sendgrid');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(PARAMETER_CHANGED_EVENT, {
        key: 'EMAIL_PROVIDER',
        value: 'sendgrid',
      });
    });
  });

  describe(`${ParameterStore.name}.getByKeys`, () => {
    it('should return a map of key-value pairs for all requested keys', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockConfigService.get.mockReturnValue(undefined);
      mockRedisService.get.mockImplementation((key: string) => {
        const map: Record<string, string> = {
          'param:EMAIL_PROVIDER': 'resend',
          'param:MAX_LOGIN_ATTEMPTS': '5',
        };
        return Promise.resolve(map[key] ?? null);
      });

      const result = await store.getByKeys(['EMAIL_PROVIDER', 'MAX_LOGIN_ATTEMPTS']);

      expect(result.size).toBe(2);
      expect(result.get('EMAIL_PROVIDER')).toBe('resend');
      expect(result.get('MAX_LOGIN_ATTEMPTS')).toBe('5');
    });

    it('should return empty map for empty keys array', async () => {
      const result = await store.getByKeys([]);
      expect(result.size).toBe(0);
    });

    it('should return default value for keys not in Redis', async () => {
      mockRegistry.getDefault.mockReturnValue('default-val');
      mockConfigService.get.mockReturnValue(undefined);
      mockRedisService.get.mockResolvedValue(null);

      const result = await store.getByKeys(['NONEXISTENT']);

      expect(result.get('NONEXISTENT')).toBe('default-val');
    });

    it('should handle Redis failure gracefully', async () => {
      mockRegistry.getDefault.mockReturnValue('fallback');
      mockConfigService.get.mockReturnValue(undefined);
      mockRedisService.get.mockRejectedValue(new Error('Redis down'));

      const result = await store.getByKeys(['EMAIL_PROVIDER']);
      expect(result.get('EMAIL_PROVIDER')).toBe('fallback');
    });
  });

  describe(`${ParameterStore.name}.has`, () => {
    it('should return true when parameter exists in registry', () => {
      mockRegistry.has.mockReturnValue(true);
      expect(store.has('EMAIL_PROVIDER')).toBe(true);
    });

    it('should return false when parameter does not exist in registry', () => {
      mockRegistry.has.mockReturnValue(false);
      expect(store.has('NONEXISTENT')).toBe(false);
    });
  });

  describe(`${ParameterStore.name}.delete`, () => {
    it('should delete from Redis and invalidate L1', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.get.mockResolvedValue('sendgrid');
      mockRedisService.del.mockResolvedValue(undefined);

      // Seed L1
      await store.get('EMAIL_PROVIDER');
      await store.delete('EMAIL_PROVIDER');

      expect(mockRedisService.del).toHaveBeenCalledWith('param:EMAIL_PROVIDER');
      // L1 should be invalidated
      mockRedisService.get.mockResolvedValue('sendgrid');
      mockRedisService.get.mockClear();
      await store.get('EMAIL_PROVIDER');
      expect(mockRedisService.get).toHaveBeenCalled();
    });

    it('should emit change event on delete', async () => {
      mockRegistry.getDefault.mockReturnValue('smtp');
      mockRedisService.del.mockResolvedValue(undefined);

      await store.delete('EMAIL_PROVIDER');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(PARAMETER_CHANGED_EVENT, {
        key: 'EMAIL_PROVIDER',
        value: null,
      });
    });
  });

  it('rejects non-finite number overrides like Infinity', async () => {
    mockRegistry.findByKey.mockReturnValue({ key: 'THROTTLE_TTL', type: 'number', default: 60, group: 'g', ttl: 300 });
    mockConfigService.get.mockReturnValue('Infinity');

    await expect(store.get('THROTTLE_TTL')).rejects.toThrow(/invalid number override/);
  });
});