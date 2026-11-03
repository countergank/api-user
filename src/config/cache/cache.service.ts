import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';

const DEFAULT_PREFIX = 'cache:';
const DEFAULT_TTL_SECONDS = 300; // 5 minutes
const SCAN_COUNT = 100;
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

interface CacheEntry<T> {
  data: T;
  expiresAt: number | null;
}

export interface CacheInvalidationPayload {
  pattern: string;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly cleanupTimer: ReturnType<typeof setInterval> | null = null;

  private hits = 0;
  private misses = 0;

  constructor(private readonly redisService: RedisService) {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired().catch((err) => {
        this.logger.error(`Cleanup error: ${(err as Error).message}`);
      });
    }, CLEANUP_INTERVAL_MS);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redisService.get(this.prefixedKey(key));
      if (raw === null) {
        this.misses++;
        return undefined;
      }

      const entry: CacheEntry<T> = JSON.parse(raw);

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.redisService.del(this.prefixedKey(key));
        this.misses++;
        return undefined;
      }

      this.hits++;
      return entry.data;
    } catch (error) {
      this.logger.error(`Cache get error for key "${key}": ${(error as Error).message}`);
      this.misses++;
      return undefined;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const effectiveTtlMs = ttlMs ?? DEFAULT_TTL_SECONDS * 1000;
      const ttlSeconds = Math.ceil(effectiveTtlMs / 1000);
      const expiresAt = Date.now() + effectiveTtlMs;

      const entry: CacheEntry<T> = { data: value, expiresAt };
      await this.redisService.set(this.prefixedKey(key), JSON.stringify(entry), ttlSeconds);
    } catch (error) {
      this.logger.error(`Cache set error for key "${key}": ${(error as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redisService.del(this.prefixedKey(key));
    } catch (error) {
      this.logger.error(`Cache del error for key "${key}": ${(error as Error).message}`);
    }
  }

  // Invalidation must enqueue its Redis command synchronously: delByPattern
  // SCANs first, so a concurrent reader could get the stale value before the
  // DEL lands. Exact keys use a plain DEL; wildcards an atomic KEYS+DEL script.
  handleInvalidationPayload(payload: CacheInvalidationPayload): Promise<number> {
    if (payload.pattern.includes('*')) {
      return this.invalidatePatternAtomically(payload.pattern);
    }
    // Emitted patterns are stored keys (with the cache: prefix); del() adds it.
    return this.del(payload.pattern.replace(/^cache:/, '')).then(() => 1);
  }

  private async invalidatePatternAtomically(pattern: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const script = `
local keys = redis.call('KEYS', KEYS[1])
local deleted = 0
for _, key in ipairs(keys) do
  deleted = deleted + redis.call('DEL', key)
end
return deleted`;
      return (await client.eval(script, 1, pattern)) as number;
    } catch (error) {
      this.logger.error(`Atomic invalidation error for pattern "${pattern}": ${(error as Error).message}`);
      return 0;
    }
  }

  @OnEvent('cache.invalidate.user')
  handleUserInvalidation(payload: CacheInvalidationPayload): Promise<number> {
    return this.handleInvalidationPayload(payload);
  }

  @OnEvent('cache.invalidate.rbac')
  handleRbacInvalidation(payload: CacheInvalidationPayload): Promise<number> {
    return this.handleInvalidationPayload(payload);
  }

  @OnEvent('cache.invalidate.templates')
  handleTemplatesInvalidation(payload: CacheInvalidationPayload): Promise<number> {
    return this.handleInvalidationPayload(payload);
  }

  async delByPattern(pattern: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', SCAN_COUNT);
        cursor = nextCursor;

        if (keys.length > 0) {
          await Promise.all(keys.map((k) => this.redisService.del(k)));
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch (error) {
      this.logger.error(`Cache delByPattern error for pattern "${pattern}": ${(error as Error).message}`);
      return 0;
    }
  }

  stats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  private prefixedKey(key: string): string {
    return `${DEFAULT_PREFIX}${key}`;
  }

  private async cleanupExpired(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      let cursor = '0';
      const now = Date.now();

      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${DEFAULT_PREFIX}*`, 'COUNT', SCAN_COUNT);
        cursor = nextCursor;

        for (const key of keys) {
          const raw = await this.redisService.get(key);
          if (raw === null) continue;

          try {
            const entry: CacheEntry<unknown> = JSON.parse(raw);
            if (entry.expiresAt && now > entry.expiresAt) {
              await this.redisService.del(key);
            }
          } catch {
            // Corrupted entry — delete it
            await this.redisService.del(key);
          }
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.error(`Cleanup expired error: ${(error as Error).message}`);
    }
  }
}
