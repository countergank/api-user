import {
  ValidationPipe as NestValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Custom ValidationPipe that produces ErrorResponseDto-shaped validation errors.
 *
 * Extends NestJS ValidationPipe with:
 * - whitelist: strip unknown properties
 * - forbidNonWhitelisted: reject unknown properties
 * - transform: auto-transform payloads to DTO instances
 * - Custom exceptionFactory that returns HttpException with UA-COM-005 code
 */
export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            code: 'UA-COM-005',
            message: 'Validation failed',
            details: errors.map((e) => ({
              property: e.property,
              constraints: e.constraints ? Object.keys(e.constraints) : [],
            })),
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    });
  }
}
