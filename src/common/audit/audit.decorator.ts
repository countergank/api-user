import { SetMetadata } from '@nestjs/common';
import { AuditActionConfig } from './interfaces';

export const AUDIT_ACTION_KEY = 'audit_action';

/**
 * Parameterized decorator for marking service methods that require business-level audit logging.
 *
 * @example
 * ```ts
 * @AuditAction({
 *   action: 'user.create',
 *   resource: 'user',
 *   getResourceId: (result) => (result as User)._id,
 *   getBefore: (...args) => args[0],
 *   getAfter: (result) => result,
 * })
 * async create(dto: CreateUserDto) { ... }
 * ```
 */
export function AuditAction(config: AuditActionConfig) {
  return SetMetadata(AUDIT_ACTION_KEY, config);
}
