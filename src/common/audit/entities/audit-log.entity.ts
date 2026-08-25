import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../../class/base';

@Schema({
  timestamps: true,
  versionKey: false,
  collection: 'audit_logs',
})
export class AuditLog extends Base {
  @Prop({ required: true, index: true })
  correlationId: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true, index: true })
  action: string;

  @Prop({ required: true, index: true })
  resource: string;

  @Prop({ index: true })
  resourceId?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop()
  httpMethod?: string;

  @Prop()
  endpoint?: string;

  @Prop()
  statusCode?: number;

  @Prop()
  duration?: number;

  @Prop({ type: Object })
  businessContext?: {
    before?: unknown;
    after?: unknown;
  };

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Compound indexes for audit-log pagination filters
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
