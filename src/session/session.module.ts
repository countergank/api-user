import { Module } from '@nestjs/common';
import { RedisModule } from '../config/redis';
import { SessionRevocationService } from './session-revocation.service';

/**
 * Owns the refresh-token revocation store.
 *
 * Depends only on `RedisModule`, so `AuthModule` and `UserModule` can both import
 * this module without depending on each other (no circular dependency).
 */
@Module({
  imports: [RedisModule],
  providers: [SessionRevocationService],
  exports: [SessionRevocationService],
})
export class SessionModule {}
