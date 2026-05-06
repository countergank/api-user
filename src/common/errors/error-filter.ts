import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Inject, Optional } from '@nestjs/common';
import { ErrorBase } from './error-base/error-base';
import { I18nService } from '../i18n/i18n.service';

@Catch(ErrorBase, Error)
export class ErrorFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(I18nService)
    private readonly i18nService?: I18nService,
  ) {}

  async catch(exception: ErrorBase | Error, host: ArgumentsHost) {
    const httpCtx = host.switchToHttp();
    const response = httpCtx.getResponse<any>();
    const request = httpCtx.getRequest<any>();

    let status = 500;
    let message: string | string[] = (await this.translateKey('errors.INTERNAL_ERROR', request)) || 'Internal server error';

    if (exception instanceof ErrorBase) {
      status = this.getStatusFromErrorCode(exception.code);
      const errorPublic = exception.getErrorPublic();
      const translationKey = `errors.${errorPublic.code}`;
      message = (await this.translateKey(translationKey, request)) || errorPublic.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        if (Array.isArray(resp.message)) {
          // Translate each message; messages may contain | to indicate multiple errors
          const translated: string[] = [];
          for (const msg of resp.message) {
            const parts = String(msg).split('|');
            const translatedParts = await Promise.all(
              parts.map((p) => this.translateValidation(p.trim(), request)),
            );
            translated.push(...translatedParts);
          }
          message = translated;
        } else if (resp.message) {
          message = (await this.translateKey(`errors.${resp.message}`, request)) || resp.message;
        }
      } else {
        message = exception.message;
      }
    } else {
      message = exception.message;
    }

    const body: any = {
      statusCode: status,
      error: status === 500 ? 'Internal Server Error' : 'Error',
      message,
      timestamp: new Date().toISOString(),
    };

    // Works with both Express and Fastify responses
    if (typeof response.status === 'function' && typeof response.json === 'function') {
      response.status(status).json(body);
    } else if (typeof response.send === 'function') {
      response.status?.(status);
      response.send(body);
    }
  }

  private getStatusFromErrorCode(code: string): number {
    if (code.includes('001')) return 404;
    if (code.includes('002') || code.includes('003')) return 400;
    return 500;
  }

  private async translateKey(key: string, request: any): Promise<string | undefined> {
    if (!this.i18nService) return undefined;
    try {
      const lang = this.getLangFromRequest(request);
      const result = await this.i18nService.translate(key, lang);
      // Only return translation if it actually resolved (different from key)
      return result !== key ? result : undefined;
    } catch {
      return undefined;
    }
  }

  private async translateValidation(msg: string, request: any): Promise<string> {
    if (!this.i18nService) return msg;
    try {
      const lang = this.getLangFromRequest(request);
      let prefix = msg.startsWith('PASSWORD_') ? 'password' : 'validation';
      const key = `${prefix}.${msg}`;
      const translated = await this.i18nService.translate(key, lang);
      return translated !== key ? translated : msg;
    } catch {
      return msg;
    }
  }

  private getLangFromRequest(request: any): string {
    const header = request?.headers?.['accept-language'];
    if (!header) return 'es';
    const first = header.split(',')[0]?.trim()?.toLowerCase()?.slice(0, 2);
    return ['es', 'en', 'pt'].includes(first) ? first : 'es';
  }
}
