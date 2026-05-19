import { Injectable } from '@nestjs/common';
import { AuditLogRepository } from './audit-log.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  async findPaginated(filters: {
    userId?: string;
    action?: string;
    resource?: string;
    from?: Date;
    to?: Date;
    ipAddress?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));

    return this.auditLogRepository.findPaginated({
      page,
      limit,
      userId: filters.userId,
      action: filters.action,
      resource: filters.resource,
      from: filters.from,
      to: filters.to,
      ipAddress: filters.ipAddress,
    });
  }
}
