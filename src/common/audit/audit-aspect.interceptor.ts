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
    const args = context.getArgs();
    const userId = this.clsService.get('userId') ?? 'anonymous';
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
          resourceId,
          businessContext: {
            before: beforeContext,
            after: afterContext,
          },
        });
      }),
    );
  }
}
