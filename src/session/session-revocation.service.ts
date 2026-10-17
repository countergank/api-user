import { Injectable } from '@nestjs/common';
import { RedisService } from '../config/redis';

/** Denylist key per refresh token id. TTL == remaining life of that token. */
const REVOKED_JTI_PREFIX = 'revoked:refresh:';

/**
 * Denylist of revoked refresh tokens, keyed by `jti`.
 *
 * Redis keeps *only* the per-token denylist. The per-user revocation epoch is a
 * durable field of the `User` document (`sessionEpoch`, S16): an epoch stored
 * here would need a TTL, and when that TTL expired the counter would restart at
 * 1 and resurrect tokens the user had already revoked. A denylist entry has no
 * such problem — its TTL matches the remaining life of the very token it
 * denies, so it disappears exactly when the token stops being usable.
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

  private jtiKey(jti: string): string {
    return `${REVOKED_JTI_PREFIX}${jti}`;
  }
}
