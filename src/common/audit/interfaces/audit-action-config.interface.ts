export interface AuditActionConfig {
  action: string;
  resource: string;
  getResourceId?: (result: unknown, args: unknown[]) => string;
  getBefore?: (...args: unknown[]) => unknown;
  getAfter?: (result: unknown) => unknown;
}
