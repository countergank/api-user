import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { DomainError } from '../../common/errors/domain.error';
import { CacheService } from '../../config/cache';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { decryptTotpSecret } from './totp-cipher';

/** Wrong codes allowed against one challenge, the valid attempt included. */
export const TWO_FACTOR_CHALLENGE_ATTEMPTS = 5;

/** Lifetime of a pending challenge. */
export const TWO_FACTOR_CHALLENGE_TTL_MS = 5 * 60 * 1000;

const CHALLENGE_KEY_PREFIX = '2fa:challenge:';

/** Symmetric TOTP time tolerance in time steps (one step of 30 s each side). */
const TOTP_WINDOW_STEPS = 1;

interface ChallengeEntry {
  userId: string;
  attempts: number;
}

/**
 * Pending login challenges for the second factor. The plaintext token is
 * handed to the client exactly once; Redis keeps only its sha256 as key, so
 * the store never holds a value an attacker could replay elsewhere. TTL-based
 * expiry needs no cron, and the attempt budget bounds brute force per
 * challenge.
 *
 * Reads fail closed through CacheService: a missing or unreadable entry is an
 * unknown challenge, never an accepted one.
 */
@Injectable()
export class TwoFactorChallengeService {
  /** Cloned with a ±1 step window so clock drift between phone and server
   * does not reject a valid code; the global preset stays untouched. */
  private readonly totp = authenticator.clone({ window: TOTP_WINDOW_STEPS });

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
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
    await this.cacheService.set(
      this.challengeKey(token),
      { userId, attempts: TWO_FACTOR_CHALLENGE_ATTEMPTS },
      TWO_FACTOR_CHALLENGE_TTL_MS,
    );
    return token;
  }

  /**
   * Settles a pending challenge with a TOTP code.
   *
   * @param {string} token - Plaintext challenge token issued by startChallenge.
   * @param {string} code - TOTP code from the authenticator app.
   * @returns {Promise<string>} userId of the challenge owner, for token minting.
   * @throws {DomainError} INVALID_TWO_FACTOR_CHALLENGE when the challenge is
   * unknown, expired, exhausted, or its factor was disabled while pending.
   * @throws {DomainError} INVALID_TWO_FACTOR_CODE on a wrong code with budget
   * left, and on the attempt that exhausts the budget.
   * @throws {DomainError} TWO_FACTOR_NOT_ENROLLED when the stored secret
   * cannot be decrypted.
   */
  async verifyChallenge(token: string, code: string): Promise<string> {
    const entry = await this.cacheService.get<ChallengeEntry>(this.challengeKey(token));
    if (!entry) {
      throw DomainError.fromKind('INVALID_TWO_FACTOR_CHALLENGE');
    }

    const user = await this.userService.findById(entry.userId, { includeTwoFactorSecret: true });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      await this.cacheService.del(this.challengeKey(token));
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
      await this.cacheService.del(this.challengeKey(token));
      return user.id;
    }

    const remaining = entry.attempts - 1;
    if (remaining <= 0) {
      await this.cacheService.del(this.challengeKey(token));
      throw DomainError.fromKind('INVALID_TWO_FACTOR_CODE');
    }

    // Rewriting the entry refreshes the TTL, so a challenge can outlive its
    // first window by at most the remaining wrong attempts.
    await this.cacheService.set(
      this.challengeKey(token),
      { userId: entry.userId, attempts: remaining },
      TWO_FACTOR_CHALLENGE_TTL_MS,
    );
    throw DomainError.fromKind('INVALID_TWO_FACTOR_CODE');
  }

  private challengeKey(token: string): string {
    return `${CHALLENGE_KEY_PREFIX}${createHash('sha256').update(token).digest('hex')}`;
  }
}
