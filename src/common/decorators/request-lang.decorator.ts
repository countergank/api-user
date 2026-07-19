import { createParamDecorator } from '@nestjs/common';
import { extractRequestLang } from './extract-request-lang.helper';

/**
 * Custom parameter decorator that extracts the request language.
 * Delegates to the existing getRequestLang() helper which parses the
 * Accept-Language header and returns a 2-char code (es/en/pt) or undefined.
 */
export const RequestLang = createParamDecorator(extractRequestLang);
