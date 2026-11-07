import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { AuditActionConfig } from './interfaces';
import { AUDIT_ACTION_KEY } from './audit.decorator';
import { AuditEvents } from './constants/audit.events';

@Injectable()
export class AuditAspectInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly clsService: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditEnabled = this.configService.get('AUDIT_ENABLED', 'true') === 'true';
    if (!auditEnabled) {
      return next.handle();
    }

    const auditConfig = this.reflector.get<AuditActionConfig>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    if (!auditConfig) {
      return next.handle();
    }

    const _handler = context.getHandler();
    // Route params arrive here as the interceptor's own HTTP args (request,
    // response, next), which made `(_result, args) => args[0]` hooks capture the
    // request object itself. The handler params the hooks expect are the route
    // params in declaration order, followed by the request body.
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const params = (request?.params ?? {}) as Record<string, unknown>;
    const args = [...Object.values(params), request?.body];
    const requestUserId = this.clsService.get('userId');
    const userId = requestUserId === undefined || requestUserId === null ? 'anonymous' : String(requestUserId);
    const correlationId = this.clsService.getId() ?? 'unknown';

    const beforeContext = auditConfig.getBefore ? auditConfig.getBefore(...args) : undefined;

    return next.handle().pipe(
      tap((result) => {
        const resourceId = auditConfig.getResourceId
          ? auditConfig.getResourceId(result, args)
          : undefined;
        const afterContext = auditConfig.getAfter ? auditConfig.getAfter(result) : undefined;

        this.eventEmitter.emit(AuditEvents.AUDIT_BUSINESS_ACTION, {
          correlationId,
          userId,
          action: auditConfig.action,
          resource: auditConfig.resource,
          resourceId: resourceId === undefined || resourceId === null ? undefined : String(resourceId),
          businessContext: {
            before: beforeContext,
            after: afterContext,
          },
        });
      }),
    );
  }
}
