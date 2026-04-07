import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ErrorBase } from './error-base/error-base';

@Catch(ErrorBase, Error)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: ErrorBase | Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof ErrorBase) {
      status = this.getStatusFromErrorCode(exception.code);
      message = exception.getErrorPublic().message;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else {
      message = exception.message;
    }
    
    response.status(status).json({
      error: status === 500 ? 'INTERNAL_ERROR' : 'ERROR',
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private getStatusFromErrorCode(code: string): number {
    if (code.includes('001')) return 404;
    if (code.includes('002') || code.includes('003')) return 400;
    return 500;
  }
}