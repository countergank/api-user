import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../redis/redis.service';
import { ParameterRegistry } from './parameter-registry';

interface L1Entry {
  value: string | number | boolean;
  expiresAt: number | null;
}

const PREFIX = 'param:';
export const PARAMETER_CHANGED_EVENT = 'parameter.changed';

@Injectable()
export class ParameterStore {
  private readonly logger = new Logger(ParameterStore.name);
  private readonly l1Cache = new Map<string, L1Entry>();

  constructor(
    private readonly redisService: RedisService,
    private readonly registry: ParameterRegistry,
    private readonly configService: ConfigService,
    @Optional() private readonly eventEmitter?: EventEmitter2,
  ) {}

  async get(key: string): Promise<string | number | boolean> {
    // L1 cache hit (includes cached env overrides)
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && (l1Entry.expiresAt === null || Date.now() < l1Entry.expiresAt)) {
      return l1Entry.value;
    }

    // L1 miss or expired — check env var override
    this.l1Cache.delete(key);
    const envValue = this.configService.get<string>(key);
    if (envValue !== undefined) {
      const value = this.coerceValue(key, envValue);
      // Cache the converted env override in L1 for performance
      const ttl = this.registry.getTTL(key) ?? 300;
      const expiresAt = Date.now() + ttl * 1000;
      this.l1Cache.set(key, { value, expiresAt });
      return value;
    }

    let redisValue: string | null;
    try {
      redisValue = await this.redisService.get(`${PREFIX}${key}`);
    } catch (error) {
      // Redis failure: log warning, return registry default without caching
      this.logger.warn(`Redis read failed for key "${key}": ${(error as Error).message}`);
      const defaultValue = this.registry.getDefault(key);
      if (defaultValue === undefined) {
        throw new Error(`Parameter "${key}" not found in registry`);
      }
      return defaultValue;
    }

    if (redisValue !== null) {
      // COU-340: coerción fuera del try/catch de "Redis failure" para que un valor
      // corrupto falle explícitamente en vez de degradar en silencio al default.
      const value = this.coerceValue(key, redisValue);
      const ttl = this.registry.getTTL(key) ?? 300;
      const expiresAt = Date.now() + ttl * 1000;
      this.l1Cache.set(key, { value, expiresAt });
      return value;
    }

    // Redis miss: seed Redis with default
    const defaultValue = this.registry.getDefault(key);
    if (defaultValue === undefined) {
      throw new Error(`Parameter "${key}" not found in registry`);
    }
    const ttl = this.registry.getTTL(key) ?? 300;
    try {
      await this.redisService.set(`${PREFIX}${key}`, String(defaultValue), ttl);
    } catch (error) {
      this.logger.warn(`Redis seed failed for key "${key}": ${(error as Error).message}`);
    }
    const expiresAt = Date.now() + ttl * 1000;
    this.l1Cache.set(key, { value: defaultValue, expiresAt });
    return defaultValue;
  }

  async set(key: string, value: string | number | boolean): Promise<void> {
    const ttl = this.registry.getTTL(key) ?? 300;

    try {
      await this.redisService.set(`${PREFIX}${key}`, String(value), ttl);
    } catch (error) {
      this.logger.warn(`Redis write failed for key "${key}": ${(error as Error).message}`);
      // Update L1 as local fallback
      const expiresAt = Date.now() + ttl * 1000;
      this.l1Cache.set(key, { value, expiresAt });
      this.publishEvent(key, value);
      return;
    }

    // Invalidate L1 cache
    this.l1Cache.delete(key);
    this.publishEvent(key, value);
  }

  async getByKeys(keys: string[]): Promise<Map<string, string | number | boolean>> {
    const result = new Map<string, string | number | boolean>();
    const promises = keys.map(async (key) => {
      try {
        const value = await this.get(key);
        result.set(key, value);
      } catch {
        this.logger.warn(`Skipping key "${key}" in batch get`);
      }
    });
    await Promise.all(promises);
    return result;
  }

  has(key: string): boolean {
    return this.registry.has(key);
  }

  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    try {
      await this.redisService.del(`${PREFIX}${key}`);
    } catch (error) {
      this.logger.warn(`Redis delete failed for key "${key}": ${(error as Error).message}`);
    }
    this.publishEvent(key, null);
  }

  private publishEvent(key: string, value: string | number | boolean | null): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(PARAMETER_CHANGED_EVENT, { key, value });
    }
  }

  private coerceValue(key: string, value: string): string | number | boolean {
    const definition = this.registry.findByKey(key);
    if (!definition) {
      return value;
    }
    switch (definition.type) {
      case 'boolean': {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'si'].includes(normalized)) return true;
        if (['false', '0', 'no'].includes(normalized)) return false;
        throw new Error(
          `Parameter "${key}" has invalid boolean override: "${value}" (expected true/false/1/0/si/no)`,
        );
      }
      case 'number': {
        const parsed = Number(value);
        // `Number.isFinite` descarta NaN e Infinity: un umbral infinito desactivaría el
        // throttling sin error, que es peor que fallar.
        if (value.trim() === '' || !Number.isFinite(parsed)) {
          throw new Error(`Parameter "${key}" has invalid number override: "${value}"`);
        }
        return parsed;
      }
      default:
        return value;
    }
  }
}