import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../config/redis';
import { ActiveSession, ActiveSessionSchema } from './entities/active-session.entity';
import { ActiveSessionRepository } from './repository/active-session.repository';
import { ActiveSessionService } from './active-session.service';
import { SessionRevocationService } from './session-revocation.service';

/**
 * Owns the refresh-token revocation store and the durable active-session records.
 *
 * Depends only on `RedisModule` and `MongooseModule.forFeature`, so `AuthModule` and
 * `UserModule` can both import this module without depending on each other (no
 * circular dependency).
 */
@Module({
  imports: [RedisModule, MongooseModule.forFeature([{ name: ActiveSession.name, schema: ActiveSessionSchema }])],
  providers: [SessionRevocationService, ActiveSessionRepository, ActiveSessionService],
  exports: [SessionRevocationService, ActiveSessionService],
})
export class SessionModule {}
