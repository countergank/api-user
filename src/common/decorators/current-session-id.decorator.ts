import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator exposing the session id the access token was issued for
 * (`sid` claim, set by JwtAuthGuard). Undefined for legacy tokens without the
 * claim, so callers can fall back to non-rotating behavior.
 */
export const CurrentSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const sessionId = request?.sessionId;
    return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : undefined;
  },
);
