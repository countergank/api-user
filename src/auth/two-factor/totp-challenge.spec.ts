import { createHash } from 'node:crypto';
import { authenticator } from 'otplib';
import { DomainError } from '../../common/errors/domain.error';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { CacheService } from '../../config/cache';
import { encryptTotpSecret } from './totp-cipher';
import {
  TWO_FACTOR_CHALLENGE_ATTEMPTS,
  TWO_FACTOR_CHALLENGE_TTL_MS,
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

describe('TwoFactorChallengeService', () => {
  let service: TwoFactorChallengeService;
  let userService: { findById: jest.Mock };
  let cacheService: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

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
    cacheService = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new TwoFactorChallengeService(
      userService as unknown as UserService,
      { getOrThrow: jest.fn().mockReturnValue(ENCRYPTION_PASSWORD) } as never,
      cacheService as unknown as CacheService,
    );
  });

  /** Starts a challenge and rewires the mocks so the entry reads back live. */
  async function startedChallenge(attempts = TWO_FACTOR_CHALLENGE_ATTEMPTS): Promise<{ token: string; secret: string }> {
    const secret = authenticator.generateSecret();
    const token = await service.startChallenge('user-1');
    cacheService.get.mockResolvedValue({ userId: 'user-1', attempts });
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
      expect(cacheService.set).toHaveBeenCalledTimes(1);
      const [key, value, ttl] = cacheService.set.mock.calls[0];
      expect(key).toBe(challengeKeyOf(token));
      expect(key).not.toContain(token);
      expect(value).toEqual({ userId: 'user-1', attempts: TWO_FACTOR_CHALLENGE_ATTEMPTS });
      expect(ttl).toBe(TWO_FACTOR_CHALLENGE_TTL_MS);
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
      expect(cacheService.del).toHaveBeenCalledWith(challengeKeyOf(token));
    });

    it('rejects an unknown or expired token without loading the user', async () => {
      await expectDomainError(service.verifyChallenge('unknown-token', '123456'), 'INVALID_TWO_FACTOR_CHALLENGE');

      expect(userService.findById).not.toHaveBeenCalled();
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('burns exactly one attempt and stores the countdown back on a wrong code', async () => {
      const { token, secret } = await startedChallenge();

      await expectDomainError(service.verifyChallenge(token, wrongCodeFor(secret)), 'INVALID_TWO_FACTOR_CODE');

      expect(cacheService.set).toHaveBeenCalledWith(
        challengeKeyOf(token),
        { userId: 'user-1', attempts: TWO_FACTOR_CHALLENGE_ATTEMPTS - 1 },
        TWO_FACTOR_CHALLENGE_TTL_MS,
      );
      expect(cacheService.del).not.toHaveBeenCalled();
    });

    it('deletes the entry when the budget is exhausted, so the challenge dies', async () => {
      const { token, secret } = await startedChallenge(1);

      await expectDomainError(service.verifyChallenge(token, wrongCodeFor(secret)), 'INVALID_TWO_FACTOR_CODE');

      expect(cacheService.del).toHaveBeenCalledWith(challengeKeyOf(token));
      // Only the initial write of startChallenge happened: no countdown was stored back.
      expect(cacheService.set).toHaveBeenCalledTimes(1);
    });

    it('kills the challenge when the factor was disabled while it was pending', async () => {
      const token = await service.startChallenge('user-1');
      cacheService.get.mockResolvedValue({ userId: 'user-1', attempts: TWO_FACTOR_CHALLENGE_ATTEMPTS });
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorEnabled: false });

      await expectDomainError(service.verifyChallenge(token, '123456'), 'INVALID_TWO_FACTOR_CHALLENGE');

      expect(cacheService.del).toHaveBeenCalledWith(challengeKeyOf(token));
    });

    it('kills the challenge when the user no longer exists', async () => {
      const token = await service.startChallenge('user-1');
      cacheService.get.mockResolvedValue({ userId: 'ghost', attempts: TWO_FACTOR_CHALLENGE_ATTEMPTS });
      userService.findById.mockResolvedValue(null);

      await expectDomainError(service.verifyChallenge(token, '123456'), 'INVALID_TWO_FACTOR_CHALLENGE');

      expect(cacheService.del).toHaveBeenCalledWith(challengeKeyOf(token));
    });

    it('maps an undecryptable stored secret to TWO_FACTOR_NOT_ENROLLED instead of a 500', async () => {
      const token = await service.startChallenge('user-1');
      cacheService.get.mockResolvedValue({ userId: 'user-1', attempts: TWO_FACTOR_CHALLENGE_ATTEMPTS });
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorSecret: 'v1:garbage' });

      await expectDomainError(service.verifyChallenge(token, '123456'), 'TWO_FACTOR_NOT_ENROLLED');
    });
  });
});
