import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ActiveSession } from './entities/active-session.entity';
import { ActiveSessionRepository } from './repository/active-session.repository';
import { SessionRevocationService } from './session-revocation.service';

/**
 * Lifecycle of a durable active-session record.
 *
 * A session survives refresh rotation: the record keeps one stable `sessionId`
 * and only the `jti` moves, because `refreshToken()` signs a new refresh token
 * (new `jti`) on every exchange. Revocation of one session both denylists its
 * current `jti` (same TTL rule as the self-service logout) and deletes the
 * record, so the listing never shows a session that can no longer refresh.
 */
@Injectable()
export class ActiveSessionService {
  private readonly logger = new Logger(ActiveSessionService.name);

  constructor(
    private readonly repository: ActiveSessionRepository,
    private readonly revocation: SessionRevocationService,
  ) {}

  async start(userId: string, jti: string, expiresAt: Date, ip?: string, userAgent?: string): Promise<string> {
    const sessionId = randomUUID();
    await this.repository.create({
      userId,
      sessionId,
      jti,
      ip,
      userAgent,
      issuedAt: new Date(),
      lastAccessAt: new Date(),
      expiresAt,
    });
    return sessionId;
  }

  async rotate(userId: string, oldJti: string, newJti: string, expiresAt: Date): Promise<string> {
    const record = await this.repository.findByJtiAndUserId(oldJti, userId);
    if (record) {
      await this.repository.rotateSessionToken(record.sessionId, newJti, new Date(), expiresAt);
      return record.sessionId;
    }

    // A refresh token with no record predates the active-session store; the
    // rotation must not resurrect a session id the store never issued.
    this.logger.debug(`No active-session record for user ${userId} jti rotation; opening a fresh session`);
    return this.start(userId, newJti, expiresAt);
  }

  /**
   * Rotates a session located by its stable id: the record's current
   * refresh `jti` is denylisted and the record moves to `newJti`, keeping the
   * same `sessionId`. Returns null when no live record exists (pre-fixture or
   * already revoked), so the caller can open a fresh session instead.
   */
  async rotateBySessionId(userId: string, sessionId: string, newJti: string, expiresAt: Date): Promise<string | null> {
    const record = await this.repository.findBySessionIdAndUserId(sessionId, userId);
    if (!record) {
      return null;
    }

    await this.revocation.revokeJti(record.jti, Math.floor(record.expiresAt.getTime() / 1000));
    await this.repository.rotateSessionToken(sessionId, newJti, new Date(), expiresAt);
    return sessionId;
  }

  async endByJti(userId: string, jti: string): Promise<void> {
    const record = await this.repository.findByJtiAndUserId(jti, userId);
    if (record) {
      await this.repository.deleteBySessionId(record.sessionId, userId);
    }
  }

  async revokeSession(userId: string, sessionId: string): Promise<boolean> {
    const record = await this.repository.findBySessionIdAndUserId(sessionId, userId);
    if (!record) {
      return false;
    }

    await this.revocation.revokeJti(record.jti, Math.floor(record.expiresAt.getTime() / 1000));
    await this.repository.deleteBySessionId(sessionId, userId);
    return true;
  }

  async clearForUser(userId: string): Promise<void> {
    await this.repository.deleteAllForUser(userId);
  }

  listForUser(userId: string): Promise<ActiveSession[]> {
    return this.repository.listActiveByUserId(userId);
  }
}
