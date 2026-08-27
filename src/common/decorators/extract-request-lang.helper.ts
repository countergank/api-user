import { ExecutionContext } from '@nestjs/common';
import { getRequestLang } from '../i18n/request-lang.helper';

/**
 * Extract the request language from the Accept-Language header.
 * Delegates to the existing getRequestLang() helper.
 * Returns a 2-char code (es/en/pt) or undefined.
 */
export function extractRequestLang(_data: unknown, ctx: ExecutionContext): string | undefined {
  const request = ctx.switchToHttp().getRequest();
  return getRequestLang(request);
}
