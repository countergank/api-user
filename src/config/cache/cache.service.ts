import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * Stats tracker for cache hits/misses
 */
interface CacheStats {
  hits: number;
  misses: number;
}

/**
 * Cache entry wrapper with optional TTL metadata
 */
interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

/**
 * Generic cache service backed by Redis.
 *
 * Provides typed get/set with per-entry TTL,
 * exact and pattern-based invalidation,
 * and hit/miss stats for monitoring.
 *
 * @example
 * ```typescript
 * // Set with 5 minute TTL
 * await cacheService.set('user:123', userData, 5 * 60 * 1000);
 *
 * // Get (returns undefined on miss)
 * const user = await cacheService.get<User>('user:123');
 *
 * // Invalidate by pattern
 * await cacheService.invalidatePattern('user:*');
 * ```
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly stats: CacheStats = { hits: 0, misses: 0 };
  private readonly PREFIX = 'cache:';
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly redisService: RedisService) {
    // Lazy cleanup every 60 seconds for expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired().catch((err) => {
        this.logger.warn(`Cache cleanup failed: ${(err as Error).message}`);
      });
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get a cached value by key.
   * Returns undefined on miss or if entry has expired.
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const client = this.redisService.getClient();
      const raw = await client.get(this.prefixedKey(key));

      if (raw === null) {
        this.stats.misses++;
        return undefined;
      }

      const entry: CacheEntry<T> = JSON.parse(raw);

      // Check lazy expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.stats.misses++;
        // Lazy delete — don't await, fire and forget
        client.del(this.prefixedKey(key)).catch(() => {});
        return undefined;
      }

      this.stats.hits++;
      return entry.value;
    } catch (error) {
      this.logger.warn(`Cache get failed for key "${key}": ${(error as Error).message}`);
      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Set a value in cache with optional TTL.
   * @param key - Cache key
   * @param value - Value to store (will be JSON serialized)
   * @param ttlMs - Time-to-live in milliseconds (optional, no expiry if omitted)
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttlMs ? Date.now() + ttlMs : undefined,
      };

      const serialized = JSON.stringify(entry);

      if (ttlMs) {
        // Use Redis EXPIRE for hard expiry + stored expiresAt for lazy check
        // Convert ms to seconds for Redis, minimum 1 second
        const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
        await client.set(this.prefixedKey(key), serialized, 'EX', ttlSeconds);
      } else {
        await client.set(this.prefixedKey(key), serialized);
      }
    } catch (error) {
      this.logger.warn(`Cache set failed for key "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * Invalidate a single cache key.
   */
  async invalidate(key: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.del(this.prefixedKey(key));
    } catch (error) {
      this.logger.warn(`Cache invalidate failed for key "${key}": ${(error as Error).message}`);
    }
  }

  /**
   * Invalidate all keys matching a glob pattern.
   * Uses SCAN to avoid blocking Redis on large keyspaces.
   *
   * @param pattern - Glob pattern (e.g., 'user:*', 'rbac:role:*')
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const fullPattern = this.prefixedKey(pattern);
      let deletedCount = 0;

      // Use SCAN cursor-based iteration
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          // Delete in batches of 50
          for (let i = 0; i < keys.length; i += 50) {
            const batch = keys.slice(i, i + 50);
            await client.del(...batch);
            deletedCount += batch.length;
          }
        }
      } while (cursor !== '0');

      return deletedCount;
    } catch (error) {
      this.logger.warn(
        `Cache invalidatePattern failed for "${pattern}": ${(error as Error).message}`,
      );
      return 0;
    }
  }

  /**
   * Get cache statistics.
   */
  stats(): { hits: number; misses: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Reset stats counters (useful for testing).
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Get estimated number of cached entries.
   * Uses Redis DBSIZE as approximation (includes non-cache keys).
   */
  async size(): Promise<number> {
    try {
      const client = this.redisService.getClient();
      // Use SCAN to count only cache-prefixed keys (more accurate than DBSIZE)
      let count = 0;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${this.PREFIX}*`, 'COUNT', 100);
        cursor = nextCursor;
        count += keys.length;
      } while (cursor !== '0');
      return count;
    } catch (error) {
      this.logger.warn(`Cache size failed: ${(error as Error).message}`);
      return 0;
    }
  }

  /**
   * Flush all cache entries (Redis FLUSHDB).
   * Use with caution — clears entire Redis DB.
   */
  async flushAll(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.flushdb();
      this.resetStats();
    } catch (error) {
      this.logger.warn(`Cache flushAll failed: ${(error as Error).message}`);
    }
  }

  // --- Private helpers ---

  private prefixedKey(key: string): string {
    return `${this.PREFIX}${key}`;
  }

  /**
   * Lazy cleanup: scan for expired entries and delete them.
   * This is a safety net — Redis EXPIRE handles most cases.
   */
  private async cleanupExpired(): Promise<void> {
    const client = this.redisService.getClient();
    let cursor = '0';
    let cleaned = 0;

    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', `${this.PREFIX}*`, 'COUNT', 50);
      cursor = nextCursor;

      for (const key of keys) {
        try {
          const raw = await client.get(key);
          if (!raw) continue;

          const entry = JSON.parse(raw);
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await client.del(key);
            cleaned++;
          }
        } catch {
          // Skip corrupted entries
        }
      }
    } while (cursor !== '0');

    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}
