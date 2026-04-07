import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { ErrorBase } from './error-base';

@Catch(ErrorBase)
export class ErrorFilter implements ExceptionFilter {
  catch(exception: ErrorBase, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status = exception instanceof HttpException 
      ? exception.getStatus() 
      : 500;

    response.status(status).json({
      error: exception.code,
      message: exception.getErrorPublic().message,
      timestamp: exception.timestamp,
    });
  }
}