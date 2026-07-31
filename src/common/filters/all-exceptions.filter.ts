import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  Optional,
} from '@nestjs/common';
import { DomainError } from '../errors/domain.error';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { I18nService } from '../i18n/i18n.service';
import { getRequestLang } from '../i18n/request-lang.helper';

/**
 * Global exception filter that catches all unhandled exceptions.
 *
 * Priority:
 * 1. DomainError → statusCode + code from ErrorKind, message translated via i18n
 * 2. HttpException → preserves status, message, optional code
 * 3. Error / unknown → 500 with UA-COM-001
 *
 * Every response includes traceId (from TraceIdMiddleware) and ISO timestamp.
 *
 * DomainError messages are translated using the I18nService when available.
 * The translation key is `errors.{ErrorKind.kind}` (e.g. `errors.USER_NOT_FOUND`).
 * Falls back to ErrorKind.defaultMessage when no translation exists.
 *
 * NOTE: Works with both Express and Fastify responses.
 * Fastify adapter passes the raw ServerResponse as `response`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(@Optional() private readonly i18n?: I18nService) {}

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<any>();
    const response = ctx.getResponse<any>();
    const traceId = request.traceId || request.id || '';
    const lang = this.getLangFromRequest(request);

    let errorDto: ErrorResponseDto;

    // Priority 1: DomainError
    if (exception instanceof DomainError) {
      errorDto = ErrorResponseDto.fromDomainError(exception, traceId);
      this.logger.warn(`DomainError: ${errorDto.code} — ${errorDto.message}`);

      // Translate the message via i18n (respects Accept-Language header)
      if (this.i18n) {
        errorDto.message = await this.tryTranslate(`errors.${exception.kind.kind}`, errorDto.message, lang);
      }
    }
    // Priority 2: HttpException
    else if (exception instanceof HttpException) {
      errorDto = ErrorResponseDto.fromHttpException(exception, traceId);
      this.logger.warn(`HttpException: ${errorDto.code} — ${errorDto.message}`);

      // Translate HttpException messages that match i18n error keys
      // (e.g. "EMAIL_OR_USERNAME_EXISTS" → "errors.EMAIL_OR_USERNAME_EXISTS")
      if (this.i18n) {
        errorDto.message = await this.tryTranslate(`errors.${errorDto.message}`, errorDto.message, lang);
      }
    }
    // Priority 3: plain Error or unknown
    else {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      errorDto = ErrorResponseDto.fromError(error, traceId);
      this.logger.error(`Unhandled: ${error.message}`, error.stack);
    }

    // Works with both Express (response.status().json()) and Fastify (response.send())
    if (typeof response.status === 'function' && typeof response.json === 'function') {
      response.status(errorDto.statusCode).json(errorDto);
    } else if (typeof response.send === 'function') {
      response.statusCode = errorDto.statusCode;
      response.send(errorDto);
    }
  }

  /**
   * Extract the language from the request's Accept-Language header.
   * Delegates to the shared getRequestLang() helper used by @RequestLang().
   */
  private getLangFromRequest(request: any): string | undefined {
    return getRequestLang(request);
  }

  /**
   * Attempt to translate a message key via I18nService.
   *
   * I18nService.translate returns the key itself when no translation is found,
   * so we fall back to the original message in that case.
   */
  private async tryTranslate(key: string, fallback: string, lang?: string): Promise<string> {
    const translated = await this.i18n!.translate(key, lang);
    return translated !== key ? translated : fallback;
  }
}
