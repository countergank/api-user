import { AuditEvents } from './audit.events';
import type { AuditActionConfig, AuditEventPayload } from '../interfaces';

describe('Audit Events Constants', () => {
  it('should export AUDIT_HTTP_REQUEST event name', () => {
    expect(AuditEvents.AUDIT_HTTP_REQUEST).toBe('audit.http.request');
  });

  it('should export AUDIT_BUSINESS_ACTION event name', () => {
    expect(AuditEvents.AUDIT_BUSINESS_ACTION).toBe('audit.business.action');
  });
});

describe('AuditActionConfig Interface', () => {
  it('should accept valid config with required fields', () => {
    const config: AuditActionConfig = {
      action: 'user.create',
      resource: 'user',
    };
    expect(config.action).toBe('user.create');
    expect(config.resource).toBe('user');
  });

  it('should accept config with optional callbacks', () => {
    const config: AuditActionConfig = {
      action: 'user.update',
      resource: 'user',
      getResourceId: (result) => (result as Record<string, unknown>)._id as string,
      getBefore: (...args) => args[0],
      getAfter: (result) => result,
    };
    expect(config.getResourceId).toBeDefined();
    expect(config.getBefore).toBeDefined();
    expect(config.getAfter).toBeDefined();
  });
});

describe('AuditEventPayload Interface', () => {
  it('should accept HTTP audit payload', () => {
    const payload: AuditEventPayload = {
      correlationId: 'corr-123',
      userId: 'user-456',
      action: 'http.request',
      resource: 'http',
      resourceId: undefined,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      httpMethod: 'POST',
      endpoint: '/users',
      statusCode: 201,
      duration: 45,
      businessContext: undefined,
      metadata: { requestBody: { name: 'test' } },
    };
    expect(payload.correlationId).toBe('corr-123');
    expect(payload.statusCode).toBe(201);
  });

  it('should accept business action payload with before/after context', () => {
    const payload: AuditEventPayload = {
      correlationId: 'corr-789',
      userId: 'admin-1',
      action: 'user.create',
      resource: 'user',
      resourceId: 'new-user-id',
      businessContext: {
        before: undefined,
        after: { name: 'John', email: 'john@test.com' },
      },
    };
    expect(payload.action).toBe('user.create');
    expect(payload.businessContext?.after).toEqual({ name: 'John', email: 'john@test.com' });
  });
});
