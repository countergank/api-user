import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActiveSession } from '../entities/active-session.entity';

export interface CreateActiveSessionData {
  userId: string;
  sessionId: string;
  jti: string;
  ip?: string;
  userAgent?: string;
  issuedAt: Date;
  lastAccessAt: Date;
  expiresAt: Date;
}

@Injectable()
export class ActiveSessionRepository {
  constructor(
    @InjectModel(ActiveSession.name) private activeSessionModel: Model<ActiveSession>,
  ) {}

  async create(data: CreateActiveSessionData): Promise<ActiveSession> {
    return this.activeSessionModel.create(data);
  }

  async findBySessionIdAndUserId(sessionId: string, userId: string): Promise<ActiveSession | null> {
    return this.activeSessionModel
      .findOne({ sessionId, userId, expiresAt: { $gt: new Date() } })
      .exec();
  }

  async findByJtiAndUserId(jti: string, userId: string): Promise<ActiveSession | null> {
    return this.activeSessionModel
      .findOne({ jti, userId, expiresAt: { $gt: new Date() } })
      .exec();
  }

  async listActiveByUserId(userId: string): Promise<ActiveSession[]> {
    return this.activeSessionModel
      .find({ userId, expiresAt: { $gt: new Date() } })
      .sort({ lastAccessAt: -1 })
      .exec();
  }

  /**
   * Rotates a session record to a new refresh token. `expiresAt` travels with
   * every rotate and always equals the freshly minted refresh token's expiry:
   * the record must stay visible exactly as long as its live token can
   * refresh, and the denylist TTL written at revocation time then covers the
   * token's whole remaining life instead of the session's first window.
   */
  async rotateSessionToken(sessionId: string, jti: string, lastAccessAt: Date, expiresAt: Date): Promise<void> {
    await this.activeSessionModel
      .updateOne({ sessionId }, { jti, lastAccessAt, expiresAt }, { timestamps: false })
      .exec();
  }

  async deleteBySessionId(sessionId: string, userId: string): Promise<void> {
    await this.activeSessionModel.deleteOne({ sessionId, userId }).exec();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.activeSessionModel.deleteMany({ userId }).exec();
  }
}
