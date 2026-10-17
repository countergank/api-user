import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../config/redis';
import { SessionRevocationService } from './session-revocation.service';

/**
 * Minimal in-memory stand-in for the ioredis client, exposing only the
 * commands the store uses. TTLs are kept so expiry alignment can be asserted.
 */
class FakeRedisClient {
  readonly store = new Map<string, string>();
  readonly ttls = new Map<string, number>();
  failWith: Error | null = null;

  private guard(): void {
    if (this.failWith) {
      throw this.failWith;
    }
  }

  async set(key: string, value: string, _mode?: 'EX', ttlSeconds?: number): Promise<'OK'> {
    this.guard();
    this.store.set(key, value);
    if (ttlSeconds !== undefined) {
      this.ttls.set(key, ttlSeconds);
    }
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    this.guard();
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  async exists(key: string): Promise<number> {
    this.guard();
    return this.store.has(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    this.guard();
    const next = Number.parseInt(this.store.get(key) ?? '0', 10) + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.guard();
    this.ttls.set(key, seconds);
    return 1;
  }

  seed(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe(SessionRevocationService.name, () => {
  let service: SessionRevocationService;
  let client: FakeRedisClient;

  const nowSeconds = () => Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    client = new FakeRedisClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionRevocationService,
        {
          provide: RedisService,
          useValue: { getClient: () => client },
        },
      ],
    }).compile();

    service = module.get<SessionRevocationService>(SessionRevocationService);
  });

  describe(`${SessionRevocationService.name}.${SessionRevocationService.prototype.revokeJti.name}`, () => {
    const FROZEN_NOW_MS = 1_700_000_000_000;
    const FROZEN_NOW_S = FROZEN_NOW_MS / 1000;

    /** Freezes the clock so `exp - now` arithmetic is deterministic. */
    const freezeClock = () => jest.spyOn(Date, 'now').mockReturnValue(FROZEN_NOW_MS);

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('writes the denylist key with a TTL aligned to the token expiration', async () => {
      freezeClock();

      await service.revokeJti('jti-1', FROZEN_NOW_S + 600);

      expect(client.store.get('revoked:refresh:jti-1')).toBe('1');
      expect(client.ttls.get('revoked:refresh:jti-1')).toBe(600);
    });

    it('does not write when the token already expired', async () => {
      freezeClock();

      await service.revokeJti('jti-expired', FROZEN_NOW_S - 10);

      expect(client.store.has('revoked:refresh:jti-expired')).toBe(false);
      expect(client.ttls.has('revoked:refresh:jti-expired')).toBe(false);
    });

    it('rounds a sub-second remaining life up to 1 second', async () => {
      freezeClock();

      await service.revokeJti('jti-now', FROZEN_NOW_S + 0.4);

      expect(client.ttls.get('revoked:refresh:jti-now')).toBe(1);
    });

    it('is idempotent: revoking twice keeps the key revoked', async () => {
      const expSeconds = nowSeconds() + 600;

      await service.revokeJti('jti-2', expSeconds);
      await service.revokeJti('jti-2', expSeconds);

      await expect(service.isJtiRevoked('jti-2')).resolves.toBe(true);
    });

    it('throws when the store fails (fail-closed)', async () => {
      client.failWith = new Error('redis unavailable');

      await expect(service.revokeJti('jti-3', nowSeconds() + 600)).rejects.toThrow('redis unavailable');
    });
  });

  describe(`${SessionRevocationService.name}.${SessionRevocationService.prototype.isJtiRevoked.name}`, () => {
    it('returns false for an unknown jti', async () => {
      await expect(service.isJtiRevoked('unknown')).resolves.toBe(false);
    });

    it('returns true for a revoked jti', async () => {
      await service.revokeJti('jti-4', nowSeconds() + 600);

      await expect(service.isJtiRevoked('jti-4')).resolves.toBe(true);
    });

    it('throws when the store fails (fail-closed)', async () => {
      client.failWith = new Error('redis unavailable');

      await expect(service.isJtiRevoked('jti-5')).rejects.toThrow('redis unavailable');
    });
  });

  describe(`${SessionRevocationService.name}.${SessionRevocationService.prototype.revokeAllForUser.name}`, () => {
    it('increments the user epoch and expires it after 7 days', async () => {
      const epoch = await service.revokeAllForUser('user-1');

      expect(epoch).toBe(1);
      expect(client.store.get('revoked:user:user-1:epoch')).toBe('1');
      expect(client.ttls.get('revoked:user:user-1:epoch')).toBe(7 * 24 * 60 * 60);
    });

    it('increments cumulatively on every call', async () => {
      await service.revokeAllForUser('user-2');
      const epoch = await service.revokeAllForUser('user-2');

      expect(epoch).toBe(2);
      await expect(service.getUserEpoch('user-2')).resolves.toBe(2);
    });

    it('keeps epochs isolated per user', async () => {
      await service.revokeAllForUser('user-a');
      await service.revokeAllForUser('user-a');
      await service.revokeAllForUser('user-b');

      await expect(service.getUserEpoch('user-a')).resolves.toBe(2);
      await expect(service.getUserEpoch('user-b')).resolves.toBe(1);
    });

    it('throws when the store fails (fail-closed)', async () => {
      client.failWith = new Error('redis unavailable');

      await expect(service.revokeAllForUser('user-3')).rejects.toThrow('redis unavailable');
    });
  });

  describe(`${SessionRevocationService.name}.${SessionRevocationService.prototype.getUserEpoch.name}`, () => {
    it('defaults to 0 when the user has no epoch', async () => {
      await expect(service.getUserEpoch('user-without-epoch')).resolves.toBe(0);
    });

    it('returns the stored epoch', async () => {
      client.seed('revoked:user:user-4:epoch', '7');

      await expect(service.getUserEpoch('user-4')).resolves.toBe(7);
    });

    it('throws when the store fails (fail-closed)', async () => {
      client.failWith = new Error('redis unavailable');

      await expect(service.getUserEpoch('user-5')).rejects.toThrow('redis unavailable');
    });

    it('throws when the stored epoch is not a number (fail-closed)', async () => {
      client.seed('revoked:user:user-6:epoch', 'not-a-number');

      await expect(service.getUserEpoch('user-6')).rejects.toThrow();
    });
  });
});
