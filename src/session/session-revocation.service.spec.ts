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

  async exists(key: string): Promise<number> {
    this.guard();
    return this.store.has(key) ? 1 : 0;
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

  describe('scope of the store (S16)', () => {
    it('exposes no user-epoch API: the epoch lives in the User document', () => {
      const exposed = service as unknown as Record<string, unknown>;

      expect(exposed.revokeAllForUser).toBeUndefined();
      expect(exposed.getUserEpoch).toBeUndefined();
    });

    it('writes only per-token denylist keys, never a per-user epoch key', async () => {
      await service.revokeJti('jti-scope', nowSeconds() + 600);

      expect([...client.store.keys()]).toEqual(['revoked:refresh:jti-scope']);
    });
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
});
