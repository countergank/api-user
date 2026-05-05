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

  catch(exception: ErrorBase | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();

    let status = 500;
    let message: string | string[] = this.i18nService?.translate('errors.INTERNAL_ERROR') || 'Internal server error';

    if (exception instanceof ErrorBase) {
      status = this.getStatusFromErrorCode(exception.code);
      // Translate the error message using the error code
      const errorPublic = exception.getErrorPublic();
      const translationKey = `errors.${errorPublic.code}`;
      message = this.i18nService?.translate(translationKey) || errorPublic.message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle validation errors from ValidationPipe
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as any;
        if (Array.isArray(response.message)) {
          // Translate validation messages
          const lang = this.i18nService?.getLanguage() || 'es';
          message = response.message.map((msg: string) => {
            // Try to translate the message
            const translated = this.i18nService?.translate(`validation.${msg}`, lang);
            return translated && translated !== `validation.${msg}` ? translated : msg;
          });
        } else if (response.message) {
          message = this.i18nService?.translate(`errors.${response.message}`, undefined, response.message) || response.message;
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
}
