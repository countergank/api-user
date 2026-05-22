export interface AuditEventPayload {
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
  businessContext?: {
    before?: unknown;
    after?: unknown;
  };
  metadata?: Record<string, unknown>;
}
