import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { of, lastValueFrom } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditEvents } from './constants/audit.events';
import { ClsService } from 'nestjs-cls';

describe(AuditInterceptor.name, () => {
  let interceptor: AuditInterceptor;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let clsService: ClsService;

  const mockExecutionContext = (method: string, url: string, headers: Record<string, string> = {}, ip = '127.0.0.1'): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          headers,
          ip,
        }),
        getResponse: () => ({
          statusCode: 200,
          raw: {
            on: jest.fn((event: string, cb: () => void) => {
              // Simulate 'finish' event firing immediately
              if (event === 'finish') cb();
            }),
          },
        }),
      }),
      getHandler: () => ({ name: 'test' }),
    }) as unknown as ExecutionContext;

  const mockCallHandler = () =>
    ({
      handle: () => of({ data: 'ok' }),
    }) as CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditInterceptor,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const defaults: Record<string, string> = {
                AUDIT_ENABLED: 'true',
                AUDIT_LEVEL: 'standard',
              };
              return defaults[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ClsService,
          useValue: {
            getId: jest.fn(() => 'test-correlation-id'),
            get: jest.fn((key: string) => {
              if (key === 'userId') return 'user-123';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    interceptor = module.get(AuditInterceptor);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
    clsService = module.get(ClsService);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('AUDIT_ENABLED=false', () => {
    it('should skip interceptor entirely when AUDIT_ENABLED is false', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_ENABLED') return 'false';
        return 'standard';
      });

      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('AUDIT_LEVEL=minimal', () => {
    it('should skip non-auth endpoints in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should capture login endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/login');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          action: 'http.request',
          resource: 'http',
          httpMethod: 'POST',
          endpoint: '/auth/login',
        }),
      );
    });

    it('should capture register endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/register');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          endpoint: '/auth/register',
        }),
      );
    });

    it('should capture forgot-password endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/forgot-password');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          endpoint: '/auth/forgot-password',
        }),
      );
    });

    it('should capture reset-password endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/reset-password');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          endpoint: '/auth/reset-password',
        }),
      );
    });

    it('should capture verify-email endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/verify-email');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          endpoint: '/auth/verify-email',
        }),
      );
    });

    it('should capture confirm-email-change endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/confirm-email-change');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          endpoint: '/auth/confirm-email-change',
        }),
      );
    });

    it('should capture refresh-token endpoint in minimal mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'minimal';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/auth/refresh-token');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          endpoint: '/auth/refresh-token',
        }),
      );
    });
  });

  describe('AUDIT_LEVEL=standard', () => {
    it('should capture POST requests', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'standard';
        return 'true';
      });

      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          httpMethod: 'POST',
          endpoint: '/api/users',
        }),
      );
    });

    it('should capture PUT requests', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'standard';
        return 'true';
      });

      const ctx = mockExecutionContext('PUT', '/api/users/1');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          httpMethod: 'PUT',
          endpoint: '/api/users/1',
        }),
      );
    });

    it('should capture PATCH requests', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'standard';
        return 'true';
      });

      const ctx = mockExecutionContext('PATCH', '/api/users/1');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          httpMethod: 'PATCH',
          endpoint: '/api/users/1',
        }),
      );
    });

    it('should capture DELETE requests', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'standard';
        return 'true';
      });

      const ctx = mockExecutionContext('DELETE', '/api/users/1');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          httpMethod: 'DELETE',
          endpoint: '/api/users/1',
        }),
      );
    });

    it('should skip GET requests in standard mode', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'standard';
        return 'true';
      });

      const ctx = mockExecutionContext('GET', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('AUDIT_LEVEL=verbose', () => {
    it('should capture ALL requests including GETs', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'AUDIT_LEVEL') return 'verbose';
        return 'true';
      });

      const ctx = mockExecutionContext('GET', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          httpMethod: 'GET',
          endpoint: '/api/users',
        }),
      );
    });
  });

  describe('event payload', () => {
    it('should include IP address from request', async () => {
      const ctx = mockExecutionContext('POST', '/api/users', {}, '192.168.1.100');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          ipAddress: '192.168.1.100',
        }),
      );
    });

    it('should include user-agent from headers', async () => {
      const ctx = mockExecutionContext('POST', '/api/users', { 'user-agent': 'Mozilla/5.0' });
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          userAgent: 'Mozilla/5.0',
        }),
      );
    });

    it('should include userId from CLS context', async () => {
      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          userId: 'user-123',
        }),
      );
    });

    it('should use anonymous when userId is not in CLS', async () => {
      jest.spyOn(clsService, 'get').mockReturnValue(undefined);

      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          userId: 'anonymous',
        }),
      );
    });

    it('should include correlationId from CLS', async () => {
      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          correlationId: 'test-correlation-id',
        }),
      );
    });

    it('should include status code from response', async () => {
      const ctx = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'POST',
            url: '/api/users',
            headers: {},
            ip: '127.0.0.1',
          }),
          getResponse: () => ({
            statusCode: 201,
            raw: {
              on: jest.fn((event: string, cb: () => void) => {
                if (event === 'finish') cb();
              }),
            },
          }),
        }),
        getHandler: () => ({ name: 'test' }),
      } as unknown as ExecutionContext;
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AuditEvents.AUDIT_HTTP_REQUEST,
        expect.objectContaining({
          statusCode: 201,
        }),
      );
    });

    it('should include duration measurement', async () => {
      const ctx = mockExecutionContext('POST', '/api/users');
      const next = mockCallHandler();

      await lastValueFrom(interceptor.intercept(ctx, next));

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const payload = emitCall[1];
      expect(payload.duration).toBeDefined();
      expect(typeof payload.duration).toBe('number');
      expect(payload.duration).toBeGreaterThanOrEqual(0);
    });
  });
});
