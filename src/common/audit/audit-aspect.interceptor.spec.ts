import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { of, lastValueFrom } from 'rxjs';
import { AuditAspectInterceptor } from './audit-aspect.interceptor';
import { AuditEvents } from './constants/audit.events';
import { AUDIT_ACTION_KEY } from './audit.decorator';

describe(AuditAspectInterceptor.name, () => {
  let interceptor: AuditAspectInterceptor;
  let reflector: Reflector;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;
  let clsService: ClsService;

  const mockCallHandler = (result: unknown = { id: 'new-id' }) =>
    ({
      handle: () => of(result),
    }) as CallHandler;

  const mockExecutionContext = (handlerName = 'testHandler') =>
    ({
      getHandler: () => ({ name: handlerName }),
      getArgs: () => [{ name: 'Test User' }],
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditAspectInterceptor,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'AUDIT_ENABLED') return 'true';
              return defaultValue;
            }),
          },
        },
        {
          provide: ClsService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'userId') return 'user-123';
              return undefined;
            }),
            getId: jest.fn(() => 'test-correlation-id'),
          },
        },
      ],
    }).compile();

    interceptor = module.get(AuditAspectInterceptor);
    reflector = module.get(Reflector);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
    clsService = module.get(ClsService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('AUDIT_ENABLED=false', () => {
    it('should skip when AUDIT_ENABLED is false', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_ENABLED') return 'false';
        return 'true';
      });

      const ctx = mockExecutionContext();
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('no audit metadata', () => {
    it('should skip when no @AuditAction metadata is present', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      const ctx = mockExecutionContext();
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('with @AuditAction metadata', () => {
    it('should emit business action event when metadata exists', async () => {
      const auditConfig = {
        action: 'user.create',
        resource: 'user',
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const ctx = mockExecutionContext();
      const next = mockCallHandler({ _id: 'new-user-id' });

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_BUSINESS_ACTION,
        expect.objectContaining({
          action: 'user.create',
          resource: 'user',
          userId: 'user-123',
          correlationId: 'test-correlation-id',
        }),
      );
    });

    it('should call getResourceId with result and args', async () => {
      const getResourceId = jest.fn((result) => result._id);
      const auditConfig = {
        action: 'user.create',
        resource: 'user',
        getResourceId,
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const result = { _id: 'new-user-id', name: 'Test' };
      const args = [{ name: 'Test User' }];
      const ctx = {
        getHandler: () => ({ name: 'create' }),
        getArgs: () => args,
      } as unknown as ExecutionContext;
      const next = mockCallHandler(result);

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(getResourceId).toHaveBeenCalledWith(result, args);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_BUSINESS_ACTION,
        expect.objectContaining({
          resourceId: 'new-user-id',
        }),
      );
    });

    it('should call getBefore with method args', async () => {
      const getBefore = jest.fn((...args: unknown[]) => args[0]);
      const auditConfig = {
        action: 'user.update',
        resource: 'user',
        getBefore,
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const args = [{ name: 'Old Name' }, { name: 'New Name' }];
      const ctx = {
        getHandler: () => ({ name: 'update' }),
        getArgs: () => args,
      } as unknown as ExecutionContext;
      const next = mockCallHandler({ name: 'New Name' });

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(getBefore).toHaveBeenCalledWith(...args);
    });

    it('should call getAfter with result', async () => {
      const getAfter = jest.fn((result) => result);
      const auditConfig = {
        action: 'user.update',
        resource: 'user',
        getAfter,
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const result = { _id: 'user-1', name: 'Updated' };
      const ctx = mockExecutionContext();
      const next = mockCallHandler(result);

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(getAfter).toHaveBeenCalledWith(result);
    });

    it('should include before/after in businessContext', async () => {
      const auditConfig = {
        action: 'user.update',
        resource: 'user',
        getBefore: (...args: unknown[]) => ({ old: args[0] }),
        getAfter: (result: unknown) => ({ new: result }),
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const ctx = mockExecutionContext();
      const next = mockCallHandler({ name: 'Updated' });

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_BUSINESS_ACTION,
        expect.objectContaining({
          businessContext: {
            before: { old: { name: 'Test User' } },
            after: { new: { name: 'Updated' } },
          },
        }),
      );
    });

    it('should use anonymous when userId is not in CLS', async () => {
      jest.spyOn(clsService, 'get').mockReturnValue(undefined);

      const auditConfig = {
        action: 'auth.login',
        resource: 'auth',
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const ctx = mockExecutionContext();
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_BUSINESS_ACTION,
        expect.objectContaining({
          userId: 'anonymous',
        }),
      );
    });

    it('should not emit resourceId when getResourceId is not provided', async () => {
      const auditConfig = {
        action: 'auth.login',
        resource: 'auth',
      };
      jest.spyOn(reflector, 'get').mockReturnValue(auditConfig);

      const ctx = mockExecutionContext();
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const payload = emitCall[1];
      expect(payload.resourceId).toBeUndefined();
    });
  });
});
