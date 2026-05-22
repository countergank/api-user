import { AuditAction, AUDIT_ACTION_KEY } from './audit.decorator';
import { Reflector } from '@nestjs/core';

describe('AuditAction decorator', () => {
  it('should set metadata with AUDIT_ACTION_KEY', () => {
    const config = {
      action: 'user.create',
      resource: 'user',
    };

    const decorator = AuditAction(config);

    // SetMetadata returns a function that sets metadata on the target
    const target = {};
    decorator(target as any, 'testMethod', undefined as any);

    const reflector = new Reflector();
    const metadata = reflector.get(AUDIT_ACTION_KEY, target as any);
    expect(metadata).toEqual(config);
  });

  it('should store full config including optional callbacks', () => {
    const getResourceId = jest.fn(() => 'resource-123');
    const getBefore = jest.fn((...args: unknown[]) => args[0]);
    const getAfter = jest.fn((result: unknown) => result);

    const config = {
      action: 'user.update',
      resource: 'user',
      getResourceId,
      getBefore,
      getAfter,
    };

    const decorator = AuditAction(config);
    const target = {};
    decorator(target as any, 'updateMethod', undefined as any);

    const reflector = new Reflector();
    const metadata = reflector.get(AUDIT_ACTION_KEY, target as any);

    expect(metadata.action).toBe('user.update');
    expect(metadata.resource).toBe('user');
    expect(metadata.getResourceId).toBe(getResourceId);
    expect(metadata.getBefore).toBe(getBefore);
    expect(metadata.getAfter).toBe(getAfter);
  });

  it('should export AUDIT_ACTION_KEY constant', () => {
    expect(AUDIT_ACTION_KEY).toBe('audit_action');
  });
});
