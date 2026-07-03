import { ExecutionContext } from '@nestjs/common';

/**
 * Extract the authenticated user from the HTTP request.
 * The user is attached by the JWT auth guard (Passport strategy).
 * Returns undefined when no guard has attached a user.
 */
export function extractUser(ctx: ExecutionContext): any {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
}
