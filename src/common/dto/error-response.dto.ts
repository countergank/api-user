import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HttpException } from '@nestjs/common';
import { DomainError } from '../errors/domain.error';

/**
 * Unified error response DTO for all API errors.
 *
 * Every error, regardless of source, is normalized into this shape
 * by AllExceptionsFilter before being sent to the client.
 */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'UA-USR-001' })
  code: string;

  @ApiProperty({ example: 'User not found' })
  message: string;

  @ApiPropertyOptional()
  details?: unknown;

  @ApiProperty({ example: 'req_abc123def456' })
  traceId: string;

  @ApiProperty({ example: '2026-07-30T12:00:00.000Z' })
  timestamp: string;

  constructor(params: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
    traceId: string;
    timestamp: string;
  }) {
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.message = params.message;
    this.details = params.details;
    this.traceId = params.traceId;
    this.timestamp = params.timestamp;
  }

  /**
   * Factory: create from a DomainError (captures statusCode, code, message).
   */
  static fromDomainError(error: DomainError, traceId: string): ErrorResponseDto {
    return new ErrorResponseDto({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Factory: create from an HttpException (preserves statusCode, message, optional code).
   */
  static fromHttpException(exc: HttpException, traceId: string): ErrorResponseDto {
    const response = exc.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as Record<string, unknown>)?.message || exc.message;
    const code =
      typeof response === 'object'
        ? ((response as Record<string, unknown>)?.code as string) ?? `HTTP_${exc.getStatus()}`
        : `HTTP_${exc.getStatus()}`;
    const details =
      typeof response === 'object'
        ? (response as Record<string, unknown>)?.details
        : undefined;

    return new ErrorResponseDto({
      statusCode: exc.getStatus(),
      code,
      message: Array.isArray(message) ? message.join('; ') : (message as string),
      details,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Factory: create from a plain Error (produces 500/UA-COM-001).
   */
  static fromError(error: Error, traceId: string): ErrorResponseDto {
    return new ErrorResponseDto({
      statusCode: 500,
      code: 'UA-COM-001',
      message: error.message || 'Internal server error',
      traceId,
      timestamp: new Date().toISOString(),
    });
  }
}
