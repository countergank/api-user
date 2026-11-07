import { ExecutionContext } from '@nestjs/common';

/** Client context captured at session open/rotation time. */
export interface SessionContext {
  ip?: string;
  userAgent?: string;
}

export function extractSessionContext(_data: unknown, ctx: ExecutionContext): SessionContext {
  const request = ctx.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string | string[] | undefined> }>();
  return {
    ip: request.ip,
    userAgent: request.headers['user-agent'] as string | undefined,
  };
}
