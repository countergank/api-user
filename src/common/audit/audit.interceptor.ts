import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ClsService } from 'nestjs-cls';
import { AuditEvents } from './constants/audit.events';

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/auth/confirm-email-change',
  '/auth/refresh-token',
];

const MUTATION_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly clsService: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditEnabled = this.configService.get('AUDIT_ENABLED', 'true') === 'true';
    if (!auditEnabled) {
      return next.handle();
    }

    const auditLevel = this.configService.get('AUDIT_LEVEL', 'standard');
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const method = request.method;
    const url = request.url;

    if (!this.shouldAudit(method, url, auditLevel)) {
      return next.handle();
    }

    const startTime = Date.now();

    // Listen to raw response finish event — captures ALL status codes
    // including errors (401, 403, etc.) that NestJS exception filters
    // intercept before reaching the rxjs observable chain.
    response.raw.on('finish', () => {
      const userId = this.clsService.get('userId') ?? request.user?._id ?? request.user?.id ?? 'anonymous';
      const correlationId = request.id ?? this.clsService.getId() ?? 'unknown';
      const ipAddress = request.ip ?? request.headers['x-forwarded-for'] ?? 'unknown';
      const userAgent = request.headers['user-agent'] ?? 'unknown';
      this.emitAuditEvent(response, startTime, String(userId), String(correlationId), ipAddress, userAgent, method, url);
    });

    return next.handle();
  }

  private emitAuditEvent(
    response: any,
    startTime: number,
    userId: string,
    correlationId: string,
    ipAddress: string,
    userAgent: string,
    method: string,
    url: string,
  ): void {
    const duration = Date.now() - startTime;
    const statusCode = response.statusCode;

    this.eventEmitter.emit(AuditEvents.AUDIT_HTTP_REQUEST, {
      correlationId,
      userId,
      action: 'http.request',
      resource: 'http',
      ipAddress,
      userAgent,
      httpMethod: method,
      endpoint: url,
      statusCode,
      duration,
    });
  }

  private shouldAudit(method: string, url: string, auditLevel: string): boolean {
    switch (auditLevel) {
      case 'minimal':
        return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
      case 'standard':
        return MUTATION_METHODS.includes(method);
      case 'verbose':
        return true;
      default:
        return MUTATION_METHODS.includes(method);
    }
  }
}
