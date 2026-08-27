import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { RedisService } from '../redis/redis.service';

describe(CacheService.name, () => {
  let service: CacheService;

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`${CacheService.name}.get`, () => {
    it('should return parsed data when key exists and not expired', async () => {
      const key = 'user:123';
      const data = { name: 'John', age: 30 };
      const entry = { data, expiresAt: Date.now() + 60_000 };
      mockRedisService.get.mockResolvedValue(JSON.stringify(entry));

      const result = await service.get<typeof data>(key);

      expect(result).toEqual(data);
      expect(mockRedisService.get).toHaveBeenCalledWith(`cache:${key}`);
    });

    it('should return undefined when key does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return undefined when Redis throws an error', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis connection lost'));

      const result = await service.get('failing-key');

      expect(result).toBeUndefined();
    });

    it('should increment miss counter on cache miss', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await service.get('miss-key');

      const stats = service.stats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    it('should increment hit counter on cache hit', async () => {
      const entry = { data: 'test', expiresAt: null };
      mockRedisService.get.mockResolvedValue(JSON.stringify(entry));

      await service.get('hit-key');

      const stats = service.stats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    it('should delete and return undefined for expired entries', async () => {
      const key = 'expired-key';
      const expiresAt = Date.now() - 1000;
      const entry = { data: 'old', expiresAt };
      mockRedisService.get.mockResolvedValue(JSON.stringify(entry));
      mockRedisService.del.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeUndefined();
      expect(mockRedisService.del).toHaveBeenCalledWith(`cache:${key}`);
    });

    it('should treat entries without expiresAt as never expired', async () => {
      const key = 'permanent-key';
      const entry = { data: { nested: true }, expiresAt: null };
      mockRedisService.get.mockResolvedValue(JSON.stringify(entry));

      const result = await service.get<typeof entry['data']>(key);

      expect(result).toEqual({ nested: true });
    });
  });

  describe(`${CacheService.name}.set`, () => {
    it('should store value with default TTL', async () => {
      const key = 'config:db';
      const value = { host: 'localhost' };

      await service.set(key, value);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `cache:${key}`,
        expect.stringContaining(JSON.stringify(value)),
        300,
      );
    });

    it('should store value with custom TTL', async () => {
      const key = 'session:abc';
      const value = { userId: '123' };
      const ttlMs = 60_000;

      await service.set(key, value, ttlMs);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `cache:${key}`,
        expect.stringContaining(JSON.stringify(value)),
        60,
      );
    });

    it('should include expiresAt metadata in stored entry', async () => {
      const key = 'test:meta';
      const before = Date.now();

      await service.set(key, { val: 1 }, 10_000);

      const storedJson = mockRedisService.set.mock.calls[0][1];
      const entry = JSON.parse(storedJson);

      expect(entry).toHaveProperty('data');
      expect(entry).toHaveProperty('expiresAt');
      expect(entry.expiresAt).toBeGreaterThanOrEqual(before + 10_000);
      expect(entry.expiresAt).toBeLessThanOrEqual(before + 10_001);
    });

    it('should not throw when Redis set fails', async () => {
      mockRedisService.set.mockRejectedValue(new Error('Redis write failed'));

      await expect(
        service.set('fail-key', { data: 'test' }),
      ).resolves.not.toThrow();
    });
  });

  describe(`${CacheService.name}.del`, () => {
    it('should delete a single key with prefix', async () => {
      await service.del('remove-me');

      expect(mockRedisService.del).toHaveBeenCalledWith('cache:remove-me');
    });

    it('should not throw when Redis del fails', async () => {
      mockRedisService.del.mockRejectedValue(new Error('Redis del failed'));

      await expect(service.del('fail-key')).resolves.not.toThrow();
    });
  });

  describe(`${CacheService.name}.delByPattern`, () => {
    it('should delete keys matching pattern using SCAN', async () => {
      const mockClient = {
        scan: jest.fn(),
      };
      mockRedisService.getClient.mockReturnValue(mockClient);

      mockClient.scan
        .mockResolvedValueOnce(['120', ['cache:user:1', 'cache:user:2']])
        .mockResolvedValueOnce(['0', ['cache:user:3']]);

      const deletedCount = await service.delByPattern('cache:user:*');

      expect(deletedCount).toBe(3);
      expect(mockClient.scan).toHaveBeenCalledTimes(2);
      expect(mockClient.scan).toHaveBeenCalledWith('0', 'MATCH', 'cache:user:*', 'COUNT', 100);
      expect(mockRedisService.del).toHaveBeenCalledTimes(3);
    });

    it('should return 0 when no keys match', async () => {
      const mockClient = {
        scan: jest.fn().mockResolvedValue(['0', []]),
      };
      mockRedisService.getClient.mockReturnValue(mockClient);

      const deletedCount = await service.delByPattern('cache:nonexistent:*');

      expect(deletedCount).toBe(0);
    });

    it('should return 0 when SCAN throws an error', async () => {
      const mockClient = {
        scan: jest.fn().mockRejectedValue(new Error('SCAN failed')),
      };
      mockRedisService.getClient.mockReturnValue(mockClient);

      const deletedCount = await service.delByPattern('cache:bad:*');

      expect(deletedCount).toBe(0);
    });
  });

  describe(`${CacheService.name}.stats`, () => {
    it('should return initial stats with zero counters', () => {
      const stats = service.stats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });

    it('should calculate correct hit rate', async () => {
      const hitEntry = { data: { v: 1 }, expiresAt: null };
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(hitEntry))
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(hitEntry));

      await service.get('key1');
      await service.get('key2');
      await service.get('key3');

      const stats = service.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });
  });

  describe(`${CacheService.name}.resetStats`, () => {
    it('should reset all counters to zero', async () => {
      const entry = { data: 1, expiresAt: null };
      mockRedisService.get.mockResolvedValue(JSON.stringify(entry));
      await service.get('some-key');

      service.resetStats();

      const stats = service.stats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });
});
