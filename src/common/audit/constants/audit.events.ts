export const AuditEvents = {
  AUDIT_HTTP_REQUEST: 'audit.http.request',
  AUDIT_BUSINESS_ACTION: 'audit.business.action',
} as const;

export type AuditEventType = (typeof AuditEvents)[keyof typeof AuditEvents];
