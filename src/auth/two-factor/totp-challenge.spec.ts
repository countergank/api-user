import { createHash } from 'node:crypto';
import { authenticator } from 'otplib';
import { DomainError } from '../../common/errors/domain.error';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { RedisService } from '../../config/redis';
import { encryptTotpSecret } from './totp-cipher';
import {
  TWO_FACTOR_CHALLENGE_ATTEMPTS,
  TWO_FACTOR_CHALLENGE_TTL_SECONDS,
  TwoFactorChallengeService,
} from './totp-challenge';

const ENCRYPTION_PASSWORD = 'unit-test-encryption-password';

async function expectDomainError(promise: Promise<unknown>, kind: string): Promise<void> {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(DomainError);
  expect((thrown as DomainError).kind.kind).toBe(kind);
}

const challengeKeyOf = (token: string): string =>
  `2fa:challenge:${createHash('sha256').update(token).digest('hex')}`;

/**
 * In-memory ioredis double for the commands the challenge store uses. eval
 * dispatches on the script markers to the same atomic semantics the real
 * scripts have, so concurrent calls interleave over the shared state.
 */
class FakeRedis {
  readonly hashes = new Map<string, Map<string, string>>();
  readonly expireCalls: Array<{ key: string; seconds: number }> = [];

  hset(key: string, ...pairs: Array<string | number>): number {
    const hash = this.hashes.get(key) ?? new Map<string, string>();
    this.hashes.set(key, hash);
    for (let i = 0; i < pairs.length; i += 2) {
      hash.set(String(pairs[i]), String(pairs[i + 1]));
    }
    return 1;
  }

  hget(key: string, field: string): string | null {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  expire(key: string, seconds: number): number {
    if (!this.hashes.has(key)) {
      return 0;
    }
    this.expireCalls.push({ key, seconds });
    return 1;
  }

  del(...keys: string[]): number {
    return keys.filter((key) => this.hashes.delete(key)).length;
  }

  eval(script: string, _numKeys: number, key: string): unknown {
    if (script.includes('challenge:consume')) {
      const hash = this.hashes.get(key);
      if (!hash) {
        return null;
      }
      const remaining = Number(hash.get('attempts')) - 1;
      hash.set('attempts', String(remaining));
      if (remaining < 0) {
        this.del(key);
        return -1;
      }
      return [this.hget(key, 'userId'), remaining];
    }
    if (script.includes('challenge:claim')) {
      const userId = this.hget(key, 'userId');
      return this.del(key) === 1 ? userId : null;
    }
    throw new Error(`unrouted eval script: ${script}`);
  }
}

describe('TwoFactorChallengeService', () => {
  let service: TwoFactorChallengeService;
  let userService: { findById: jest.Mock };
  let redis: FakeRedis;

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    twoFactorEnabled: true,
  } as unknown as User;

  const totp = authenticator.clone({ window: 1 });

  /** A code that cannot verify against the secret in any tolerated step. */
  function wrongCodeFor(secret: string): string {
    const valid = authenticator.generate(secret);
    for (let delta = 1; delta <= 10; delta++) {
      const candidate = `${(Number(valid[0]) + delta) % 10}${valid.slice(1)}`;
      if (!totp.verify({ token: candidate, secret })) {
        return candidate;
      }
    }
    throw new Error('no wrong code could be derived');
  }

  beforeEach(() => {
    userService = { findById: jest.fn() };
    redis = new FakeRedis();
    service = new TwoFactorChallengeService(
      userService as unknown as UserService,
      { getOrThrow: jest.fn().mockReturnValue(ENCRYPTION_PASSWORD) } as never,
      { getClient: () => redis } as unknown as RedisService,
    );
  });

  /** Starts a challenge whose owner reads back with a decryptable secret. */
  async function startedChallenge(): Promise<{ token: string; secret: string }> {
    const secret = authenticator.generateSecret();
    const token = await service.startChallenge('user-1');
    userService.findById.mockResolvedValue({
      ...baseUser,
      twoFactorSecret: encryptTotpSecret(secret, ENCRYPTION_PASSWORD),
    });
    return { token, secret };
  }

  describe('startChallenge', () => {
    it('stores only the sha256 of a CSPRNG token, with the attempt budget and the 5-minute TTL', async () => {
      const token = await service.startChallenge('user-1');

      expect(token).toHaveLength(43); // 32 random bytes, base64url
      const key = challengeKeyOf(token);
      expect(key).not.toContain(token);
      expect(redis.hget(key, 'userId')).toBe('user-1');
      expect(redis.hget(key, 'attempts')).toBe(String(TWO_FACTOR_CHALLENGE_ATTEMPTS));
      expect(redis.expireCalls).toEqual([{ key, seconds: TWO_FACTOR_CHALLENGE_TTL_SECONDS }]);
    });

    it('returns a different token on every challenge', async () => {
      const first = await service.startChallenge('user-1');
      const second = await service.startChallenge('user-1');

      expect(first).not.toBe(second);
    });
  });

  describe('verifyChallenge', () => {
    it('resolves the userId and deletes the entry on a valid code', async () => {
      const { token, secret } = await startedChallenge();

      const userId = await service.verifyChallenge(token, authenticator.generate(secret));

      expect(userId).toBe('user-1');
      expect(redis.hashes.has(challengeKeyOf(token))).toBe(false);
    });

    it('rejects an unknown or expired token without loading the user', async () => {
      await expectDomainError(service.verifyChallenge('unknown-token', '123456'), 'INVALID_TWO_FACTOR_CHALLENGE');

      expect(userService.findById).not.toHaveBeenCalled();
    });

    it('charges one budget unit per attempt — concurrent or not — and never refreshes the TTL', async () => {
      const { token, secret } = await startedChallenge();
      const wrong = wrongCodeFor(secret);

      await expectDomainError(service.verifyChallenge(token, wrong), 'INVALID_TWO_FACTOR_CODE');
      expect(redis.hget(challengeKeyOf(token), 'attempts')).toBe(String(TWO_FACTOR_CHALLENGE_ATTEMPTS - 1));

      await Promise.all([
        expectDomainError(service.verifyChallenge(token, wrong), 'INVALID_TWO_FACTOR_CODE'),
        expectDomainError(service.verifyChallenge(token, wrong), 'INVALID_TWO_FACTOR_CODE'),
      ]);
      expect(redis.hget(challengeKeyOf(token), 'attempts')).toBe(String(TWO_FACTOR_CHALLENGE_ATTEMPTS - 3));
      // HINCRBY mutates in place: only startChallenge ever set the TTL.
      expect(redis.expireCalls).toHaveLength(1);
    });

    it('deletes the challenge once the budget is spent, so the next attempt dies as unknown', async () => {
      const { token, secret } = await startedChallenge();

      for (let attempt = 0; attempt < TWO_FACTOR_CHALLENGE_ATTEMPTS; attempt++) {
        await expectDomainError(service.verifyChallenge(token, wrongCodeFor(secret)), 'INVALID_TWO_FACTOR_CODE');
      }

      await expectDomainError(
        service.verifyChallenge(token, authenticator.generate(secret)),
        'INVALID_TWO_FACTOR_CHALLENGE',
      );
      expect(redis.hashes.has(challengeKeyOf(token))).toBe(false);
    });

    it('lets only one of two concurrent valid submissions claim the challenge', async () => {
      const { token, secret } = await startedChallenge();
      const code = authenticator.generate(secret);

      const settled = await Promise.allSettled([
        service.verifyChallenge(token, code),
        service.verifyChallenge(token, code),
      ]);

      const winner = settled.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<string>;
      const loser = settled.find((result) => result.status === 'rejected') as PromiseRejectedResult;
      expect(winner.value).toBe('user-1');
      expect(loser.reason).toBeInstanceOf(DomainError);
      expect(loser.reason.kind.kind).toBe('INVALID_TWO_FACTOR_CHALLENGE');
    });

    it('kills the challenge when the factor was disabled while it was pending', async () => {
      const { token } = await startedChallenge();
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorEnabled: false });

      await expectDomainError(service.verifyChallenge(token, '123456'), 'INVALID_TWO_FACTOR_CHALLENGE');

      expect(redis.hashes.has(challengeKeyOf(token))).toBe(false);
    });

    it('kills the challenge when the user no longer exists', async () => {
      const { token } = await startedChallenge();
      userService.findById.mockResolvedValue(null);

      await expectDomainError(service.verifyChallenge(token, '123456'), 'INVALID_TWO_FACTOR_CHALLENGE');

      expect(redis.hashes.has(challengeKeyOf(token))).toBe(false);
    });

    it('maps an undecryptable stored secret to TWO_FACTOR_NOT_ENROLLED instead of a 500', async () => {
      const { token } = await startedChallenge();
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorSecret: 'v1:garbage' });

      await expectDomainError(service.verifyChallenge(token, '123456'), 'TWO_FACTOR_NOT_ENROLLED');
    });
  });
});
