import { Injectable } from '@nestjs/common';
import { RedisService } from '../config/redis';

/** Denylist key per refresh token id. TTL == remaining life of that token. */
const REVOKED_JTI_PREFIX = 'revoked:refresh:';
/** Per-user epoch used to invalidate every refresh token issued before it. */
const USER_EPOCH_PREFIX = 'revoked:user:';
export const USER_EPOCH_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * Store of revoked refresh-token sessions.
 *
 * Fail-closed by contract (S11): every store failure is propagated to the caller
 * instead of being swallowed, so the refresh exchange can reject the token and
 * the user is sent back to login. For that reason this service talks to the
 * Redis client directly — `CacheService` is intentionally not used because it
 * logs and swallows errors (it would turn a dead store into an allow decision).
 *
 * Depends only on `RedisModule`, so `AuthModule` and `UserModule` can both
 * import `SessionModule` without a circular dependency.
 */
@Injectable()
export class SessionRevocationService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * Revokes a single refresh token until it would have expired on its own.
   *
   * @param jti — JWT id of the refresh token
   * @param expSeconds — absolute expiration of the token (the `exp` claim)
   */
  async revokeJti(jti: string, expSeconds: number): Promise<void> {
    const ttlSeconds = Math.ceil(expSeconds - Date.now() / 1000);
    if (ttlSeconds < 1) {
      // Already expired: nothing to deny, the signature check rejects it anyway.
      return;
    }

    await this.redisService.getClient().set(this.jtiKey(jti), '1', 'EX', ttlSeconds);
  }

  /** @returns true when the refresh token id is in the denylist. Throws on store failure. */
  async isJtiRevoked(jti: string): Promise<boolean> {
    const found = await this.redisService.getClient().exists(this.jtiKey(jti));
    return found > 0;
  }

  /**
   * Invalidates every refresh token issued for the user so far.
   * @returns the new epoch for the user.
   */
  async revokeAllForUser(userId: string): Promise<number> {
    const client = this.redisService.getClient();
    const key = this.epochKey(userId);

    const epoch = await client.incr(key);
    await client.expire(key, USER_EPOCH_TTL_SECONDS);

    return epoch;
  }

  /**
   * @returns the current epoch of the user, `0` when the user never revoked all
   * of their sessions. Throws on store failure.
   */
  async getUserEpoch(userId: string): Promise<number> {
    const raw = await this.redisService.getClient().get(this.epochKey(userId));
    if (raw === null || raw === undefined || raw === '') {
      return 0;
    }

    const epoch = Number.parseInt(raw, 10);
    if (Number.isNaN(epoch)) {
      // Unreadable epoch: fail closed instead of silently accepting every token.
      throw new Error(`Invalid revocation epoch for user "${userId}"`);
    }

    return epoch;
  }

  private jtiKey(jti: string): string {
    return `${REVOKED_JTI_PREFIX}${jti}`;
  }

  private epochKey(userId: string): string {
    return `${USER_EPOCH_PREFIX}${userId}:epoch`;
  }
}
