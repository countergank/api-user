import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from '../logger';
import { AuditLogRepository } from './audit-log.repository';
import { AuditEventPayload } from './interfaces';

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'authorization',
  'refreshToken',
  'resetPasswordToken',
  'emailVerificationToken',
  'pendingEmailToken',
];

/**
 * Recursively redacts sensitive fields from an object.
 * Matches keys case-insensitively: exact match for 'password', 'authorization', 'refreshToken'
 * and substring match for 'token' (catches resetPasswordToken, emailVerificationToken, etc.)
 */
export function redactSensitiveFields<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveFields(item)) as unknown as T;
  }

  const result = { ...obj } as Record<string, unknown>;

  for (const key of Object.keys(result)) {
    const isSensitive = SENSITIVE_FIELDS.some((field) => {
      if (field === 'token') {
        return key.toLowerCase().includes(field);
      }
      return key.toLowerCase() === field.toLowerCase();
    });

    if (isSensitive) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object' && result[key] !== null) {
      result[key] = redactSensitiveFields(result[key] as Record<string, unknown>);
    }
  }

  return result as T;
}

@Injectable()
export class AuditListener {
  private readonly logger = new CustomLogger(AuditListener.name);

  constructor(
    private readonly auditLogRepository: AuditLogRepository,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('audit.*')
  async handleAuditEvent(payload: AuditEventPayload): Promise<void> {
    try {
      const auditEnabled = this.configService.get('AUDIT_ENABLED', 'true') === 'true';
      if (!auditEnabled) {
        return;
      }

      const redactedPayload = redactSensitiveFields(payload);
      await this.auditLogRepository.create(redactedPayload as AuditEventPayload);
    } catch (error) {
      this.logger.error(`Failed to persist audit log: ${(error as Error).message}`);
    }
  }
}
