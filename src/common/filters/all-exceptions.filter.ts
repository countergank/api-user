import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { DomainError } from '../errors/domain.error';
import { ErrorResponseDto } from '../dto/error-response.dto';

/**
 * Global exception filter that catches all unhandled exceptions.
 *
 * Priority:
 * 1. DomainError → statusCode + code from ErrorKind
 * 2. HttpException → preserves status, message, optional code
 * 3. Error / unknown → 500 with UA-COM-001
 *
 * Every response includes traceId (from TraceIdMiddleware) and ISO timestamp.
 *
 * NOTE: Works with both Express and Fastify responses.
 * Fastify adapter passes the raw ServerResponse as `response`.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<any>();
    const response = ctx.getResponse<any>();
    const traceId = request.traceId || request.id || '';

    let errorDto: ErrorResponseDto;

    // Priority 1: DomainError
    if (exception instanceof DomainError) {
      errorDto = ErrorResponseDto.fromDomainError(exception, traceId);
      this.logger.warn(`DomainError: ${errorDto.code} — ${errorDto.message}`);
    }
    // Priority 2: HttpException
    else if (exception instanceof HttpException) {
      errorDto = ErrorResponseDto.fromHttpException(exception, traceId);
      this.logger.warn(`HttpException: ${errorDto.code} — ${errorDto.message}`);
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
}
