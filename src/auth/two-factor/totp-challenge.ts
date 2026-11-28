import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { DomainError } from '../../common/errors/domain.error';
import { RedisService } from '../../config/redis';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { decryptTotpSecret } from './totp-cipher';

/** Wrong codes allowed against one challenge, the valid attempt included. */
export const TWO_FACTOR_CHALLENGE_ATTEMPTS = 5;

/** Lifetime of a pending challenge. */
export const TWO_FACTOR_CHALLENGE_TTL_SECONDS = 300;

const CHALLENGE_KEY_PREFIX = '2fa:challenge:';

/** Symmetric TOTP time tolerance in time steps (one step of 30 s each side). */
const TOTP_WINDOW_STEPS = 1;

// challenge:consume — burns one budget unit atomically: nil for a missing
// challenge, -1 once the budget is spent (the key dies with it), otherwise
// {userId, remaining}. HINCRBY mutates in place, so the TTL is never refreshed.
const CONSUME_ATTEMPT_SCRIPT = `
-- challenge:consume
if redis.call('EXISTS', KEYS[1]) == 0 then
  return nil
end
local remaining = redis.call('HINCRBY', KEYS[1], 'attempts', -1)
if remaining < 0 then
  redis.call('DEL', KEYS[1])
  return -1
end
return { redis.call('HGET', KEYS[1], 'userId'), remaining }
`;

// challenge:claim — deletes the key and hands out the userId to exactly one caller; race losers get nil.
const CLAIM_CHALLENGE_SCRIPT = `
-- challenge:claim
local userId = redis.call('HGET', KEYS[1], 'userId')
if redis.call('DEL', KEYS[1]) == 1 then
  return userId
end
return nil
`;

/**
 * Pending login challenges for the second factor. The plaintext token is
 * handed to the client exactly once; Redis keeps only its sha256 as key, so
 * the store never holds a value an attacker could replay elsewhere. TTL-based
 * expiry needs no cron, and the attempt budget bounds brute force per
 * challenge.
 *
 * Budget burn and the single-use success claim run as atomic Lua scripts, so
 * concurrent submissions share neither a budget unit nor a success.
 */
@Injectable()
export class TwoFactorChallengeService {
  /** Cloned with a ±1 step window so clock drift between phone and server
   * does not reject a valid code; the global preset stays untouched. */
  private readonly totp = authenticator.clone({ window: TOTP_WINDOW_STEPS });

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Opens a pending challenge for a user whose password already validated and
   * returns the single-use plaintext token.
   *
   * @param {string} userId - Owner of the pending challenge.
   * @returns {Promise<string>} Token to hand to the client exactly once.
   */
  async startChallenge(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const key = this.challengeKey(token);
    const client = this.redisService.getClient();
    await client.hset(key, 'userId', userId, 'attempts', TWO_FACTOR_CHALLENGE_ATTEMPTS);
    await client.expire(key, TWO_FACTOR_CHALLENGE_TTL_SECONDS);
    return token;
  }

  /**
   * Settles a pending challenge with a TOTP code.
   *
   * @param {string} token - Plaintext challenge token issued by startChallenge.
   * @param {string} code - TOTP code from the authenticator app.
   * @returns {Promise<string>} userId of the challenge owner, for token minting.
   * @throws {DomainError} INVALID_TWO_FACTOR_CHALLENGE when the challenge is
   * unknown, expired, exhausted, claimed by a concurrent submission, or its
   * factor was disabled while pending.
   * @throws {DomainError} INVALID_TWO_FACTOR_CODE on a wrong code with budget
   * left, and on the attempt that exhausts the budget.
   * @throws {DomainError} TWO_FACTOR_NOT_ENROLLED when the stored secret
   * cannot be decrypted.
   */
  async verifyChallenge(token: string, code: string): Promise<string> {
    const key = this.challengeKey(token);
    const client = this.redisService.getClient();
    const consumed = await client.eval(CONSUME_ATTEMPT_SCRIPT, 1, key);
    if (!Array.isArray(consumed)) {
      throw DomainError.fromKind('INVALID_TWO_FACTOR_CHALLENGE');
    }

    const user = await this.userService.findById(consumed[0], { includeTwoFactorSecret: true });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      await client.del(key);
      throw DomainError.fromKind('INVALID_TWO_FACTOR_CHALLENGE');
    }

    let secret: string;
    try {
      secret = decryptTotpSecret(user.twoFactorSecret, this.configService.getOrThrow<string>('ENCRYPTION_PASSWORD'));
    } catch {
      // An undecryptable ciphertext (e.g. after an ENCRYPTION_PASSWORD
      // rotation) is not a usable factor.
      throw DomainError.fromKind('TWO_FACTOR_NOT_ENROLLED');
    }

    if (this.totp.verify({ token: code, secret })) {
      const claimed = (await client.eval(CLAIM_CHALLENGE_SCRIPT, 1, key)) as string | null;
      if (claimed === null) {
        throw DomainError.fromKind('INVALID_TWO_FACTOR_CHALLENGE');
      }
      return user.id;
    }

    throw DomainError.fromKind('INVALID_TWO_FACTOR_CODE');
  }

  private challengeKey(token: string): string {
    return `${CHALLENGE_KEY_PREFIX}${createHash('sha256').update(token).digest('hex')}`;
  }
}
