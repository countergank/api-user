import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogRepository {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  async create(data: {
    correlationId: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    httpMethod?: string;
    endpoint?: string;
    statusCode?: number;
    duration?: number;
    businessContext?: { before?: unknown; after?: unknown };
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog> {
    const entry = new this.auditLogModel(data);
    return entry.save();
  }

  async findPaginated(filters: {
    page: number;
    limit: number;
    userId?: string;
    action?: string;
    resource?: string;
    from?: Date;
    to?: Date;
    ipAddress?: string;
  }): Promise<{ data: AuditLog[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.resource) {
      query.resource = filters.resource;
    }
    if (filters.ipAddress) {
      query.ipAddress = filters.ipAddress;
    }
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        (query.createdAt as Record<string, unknown>).$gte = filters.from;
      }
      if (filters.to) {
        (query.createdAt as Record<string, unknown>).$lte = filters.to;
      }
    }

    const skip = (filters.page - 1) * filters.limit;

    const [data, total] = await Promise.all([
      this.auditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).lean().exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    return { data: data as unknown as AuditLog[], total };
  }
}
