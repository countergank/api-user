# Design: COU-203 Error Handling System — Phase 1 Foundation

## Overview

Phase 1 establishes the foundational error handling infrastructure for api-user by adapting the backend-template's clean pattern (DomainError, ErrorKind registry, ErrorResponseDto, global filter, trace ID middleware, validation pipe) while preserving api-user's existing i18n and UA-{GROUP}-{CODE} error code format.

## Architecture

### Layer Diagram

```
┌──────────────────────────────────────────────────┐
│                   Controllers                     │
│  (throw DomainError / HttpException — no try/catch)│
└──────────────────────┬───────────────────────────┘
                       │ throws
┌──────────────────────▼───────────────────────────┐
│               AllExceptionsFilter                  │
│  @Catch() — catches everything                    │
│  Priority: DomainError > HttpException > Error    │
│  Injects: traceId, timestamp, i18n translation    │
│  Logs via: nestjs-pino                            │
└──────┬───────────────────────────────┬────────────┘
       │ uses                          │ uses
┌──────▼──────────┐    ┌───────────────▼────────────┐
│  ErrorResponseDto│    │      TraceIdMiddleware      │
│  unified shape   │    │  sets x-trace-id header    │
└──────┬──────────┘    └────────────────────────────┘
       │ uses
┌──────▼──────────┐
│   DomainError    │
│  + ErrorKind     │
│  registry        │
│  + static from() │
└─────────────────┘
```

### Request Flow

```
Request → TraceIdMiddleware → [Guards → Interceptors → Controller → Service]
                                                                   │
                                                          throws DomainError
                                                                   │
                                                                   ▼
                                                      AllExceptionsFilter
                                                           │
                                                      ErrorResponseDto
                                                           │
                                                    Response (with x-trace-id)
```

## Component Design

### 1. ErrorKind Registry

**File**: `src/common/errors/error-kind.ts`

A `const` object defining every error in the system. Typed with `as const` for type inference.

```typescript
// Initial entries for Phase 1 — extend per-module during migration
export const ErrorKind = {
  INTERNAL: {
    kind: 'INTERNAL',
    group: 'COM',
    code: 'UA-COM-001',
    statusCode: 500,
    defaultMessage: 'Internal server error',
  },
  APP_ERROR: {
    kind: 'APP_ERROR',
    group: 'APP',
    code: 'UA-APP-001',
    statusCode: 500,
    defaultMessage: 'Application error',
  },
  APP_VERSION_NOT_FOUND: {
    kind: 'APP_VERSION_NOT_FOUND',
    group: 'APP',
    code: 'UA-APP-002',
    statusCode: 404,
    defaultMessage: 'App version not found',
  },
  ENTITY_NOT_FOUND: {
    kind: 'ENTITY_NOT_FOUND',
    group: 'COM',
    code: 'UA-COM-002',
    statusCode: 404,
    defaultMessage: 'Entity not found',
  },
  ENTITY_NAME_ALREADY_EXISTS: {
    kind: 'ENTITY_NAME_ALREADY_EXISTS',
    group: 'COM',
    code: 'UA-COM-003',
    statusCode: 409,
    defaultMessage: 'Name already exists',
  },
  ENTITY_EMAIL_ALREADY_EXISTS: {
    kind: 'ENTITY_EMAIL_ALREADY_EXISTS',
    group: 'COM',
    code: 'UA-COM-004',
    statusCode: 409,
    defaultMessage: 'Email already exists',
  },
  USER_NOT_FOUND: {
    kind: 'USER_NOT_FOUND',
    group: 'USR',
    code: 'UA-USR-001',
    statusCode: 404,
    defaultMessage: 'User not found',
  },
  USER_ALREADY_DELETED: {
    kind: 'USER_ALREADY_DELETED',
    group: 'USR',
    code: 'UA-USR-002',
    statusCode: 410,
    defaultMessage: 'User already deleted',
  },
  VALIDATION_ERROR: {
    kind: 'VALIDATION_ERROR',
    group: 'COM',
    code: 'UA-COM-005',
    statusCode: 400,
    defaultMessage: 'Validation failed',
  },
} as const;

export type ErrorKindName = keyof typeof ErrorKind;
export type ErrorKindEntry = (typeof ErrorKind)[ErrorKindName];
```

### 2. DomainError

**File**: `src/common/errors/domain.error.ts`

```typescript
import { ErrorKind, ErrorKindName, ErrorKindEntry } from './error-kind';

export class DomainError extends Error {
  public readonly kind: ErrorKindEntry;
  public readonly traceId?: string;

  private constructor(
    kind: ErrorKindEntry,
    message?: string,
    traceId?: string,
  ) {
    super(message || kind.defaultMessage);
    this.name = 'DomainError';
    this.kind = kind;
    this.traceId = traceId;
  }

  public get statusCode(): number {
    return this.kind.statusCode;
  }

  public get code(): string {
    return this.kind.code;
  }

  static fromKind(name: ErrorKindName, overrides?: {
    message?: string;
    traceId?: string;
  }): DomainError {
    const kind = ErrorKind[name];
    if (!kind) {
      // Fallback to INTERNAL if unknown kind
      return new DomainError(ErrorKind.INTERNAL, `Unknown error kind: ${name}`);
    }
    return new DomainError(kind, overrides?.message, overrides?.traceId);
  }

  static internal(message?: string): DomainError {
    return new DomainError(ErrorKind.INTERNAL, message || 'Internal server error');
  }
}
```

**Key decisions**:
- DomainError extends native `Error` (not ErrorBase) — clean prototype chain
- `kind` stores the full ErrorKind entry (not just the name) — avoids lookup on every throw
- `fromKind(name)` is the primary factory — type-safe via `ErrorKindName`
- `traceId` is optional at construction time; the filter injects it from request context

### 3. ErrorResponseDto

**File**: `src/common/dto/error-response.dto.ts`

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DomainError } from '../errors/domain.error';
import { HttpException } from '@nestjs/common';

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

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
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

  static fromDomainError(error: DomainError, traceId: string): ErrorResponseDto {
    return new ErrorResponseDto({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

  static fromHttpException(
    exc: HttpException,
    traceId: string,
  ): ErrorResponseDto {
    const response = exc.getResponse();
    const message = typeof response === 'string'
      ? response
      : (response as Record<string, unknown>)?.message || exc.message;
    const code = typeof response === 'object'
      ? (response as Record<string, unknown>)?.code as string ?? `HTTP_${exc.getStatus()}`
      : `HTTP_${exc.getStatus()}`;

    return new ErrorResponseDto({
      statusCode: exc.getStatus(),
      code,
      message: Array.isArray(message) ? message.join('; ') : message as string,
      traceId,
      timestamp: new Date().toISOString(),
    });
  }

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
```

### 4. TraceIdMiddleware

**File**: `src/common/middleware/trace-id.middleware.ts`

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  use(req: FastifyRequest, _res: FastifyReply, next: () => void) {
    const traceId = (req as any).id || crypto.randomUUID();
    _res.header('x-trace-id', traceId);
    // Store traceId on request for use by filter
    (req as any).traceId = traceId;
    next();
  }
}
```

**Registration** (in AppModule):
```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
```

### 5. AllExceptionsFilter

**File**: `src/common/filters/all-exceptions.filter.ts`

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { DomainError } from '../errors/domain.error';
import { ErrorResponseDto } from '../dto/error-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly i18nService?: any; // Inject if available

  constructor(i18nService?: any) {
    this.i18nService = i18nService;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();
    const traceId = (request as any).traceId || (request as any).id || '';

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

    reply.status(errorDto.statusCode).send(errorDto);
  }
}
```

### 6. ValidationPipe

**File**: `src/common/pipes/validation.pipe.ts`

```typescript
import {
  ValidationPipe as NestValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

export class ValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        // Will be caught by AllExceptionsFilter and formatted
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
```

## Module Registration Changes

### AppModule (`src/app/app.module.ts`)

Additions:
```typescript
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { TraceIdMiddleware } from '../common/middleware/trace-id.middleware';
// ... in providers:
{
  provide: APP_FILTER,
  useFactory: (i18nService?: any) => new AllExceptionsFilter(i18nService),
  inject: [/* I18nService if available */],
},
// ... NestModule.configure:
consumer.apply(TraceIdMiddleware).forRoutes('*');
```

### main.ts — Removal

Remove:
```typescript
app.useGlobalFilters(new ErrorFilter(i18nService));
```

No other changes to main.ts.

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/common/errors/error-kind.ts` | ErrorKind registry |
| `src/common/errors/domain.error.ts` | DomainError class |
| `src/common/dto/error-response.dto.ts` | Unified error response DTO |
| `src/common/middleware/trace-id.middleware.ts` | Trace ID middleware |
| `src/common/filters/all-exceptions.filter.ts` | Global exception filter |
| `src/common/pipes/validation.pipe.ts` | Custom validation pipe |
| `src/common/errors/__tests__/domain.error.spec.ts` | DomainError tests |
| `src/common/errors/__tests__/error-kind.spec.ts` | ErrorKind registry tests |
| `src/common/dto/__tests__/error-response.dto.spec.ts` | ErrorResponseDto tests |
| `src/common/middleware/__tests__/trace-id.middleware.spec.ts` | TraceIdMiddleware tests |
| `src/common/filters/__tests__/all-exceptions.filter.spec.ts` | Filter tests |
| `src/common/pipes/__tests__/validation.pipe.spec.ts` | Validation pipe tests |

### Modified Files

| File | Change |
|------|--------|
| `src/app/app.module.ts` | Add APP_FILTER provider, configure TraceIdMiddleware |
| `src/main.ts` | Remove `app.useGlobalFilters(new ErrorFilter(...))` |

## Backward Compatibility

- **ErrorBase hierarchy**: Not touched in Phase 1. The new filter handles both DomainError and any ErrorBase subclasses that bubble up uncaught.
- **Controller try/catch**: Not removed in Phase 1. Services still throw ErrorBase; controllers still catch them. Phase 2+ will migrate modules.
- **HTTP response shape**: Changes from existing `{ statusCode, error, message, timestamp }` to `{ statusCode, code, message, details?, traceId, timestamp }`. This is a BREAKING change for API clients that parse the error shape.

## Migration Strategy (Phase 2+ — Not Implemented Here)

1. Per module: Create ErrorKind entries → Convert service throws → Remove controller try/catch
2. Run full test suite after each module
3. Deprecate ErrorBase hierarchy after all modules migrated
4. Remove old ErrorFilter, error dictionaries, legacy DTOs

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change to HTTP error shape | High | Document in changelog; new clients expected |
| I18nService not available in filter at registration time | Medium | Make i18n optional; fallback to hardcoded messages |
| ErrorFilter (old) still registered via main.ts causes double-handling | Medium | Remove `app.useGlobalFilters` in the same commit |
| Existing tests check old error shape | High | Update test assertions to match new ErrorResponseDto |

## Acceptance Criteria

1. AllExceptionsFilter catches DomainError → correct statusCode and code
2. AllExceptionsFilter catches HttpException → preserves statusCode and message
3. AllExceptionsFilter catches plain Error → returns 500 with traceId
4. Every error response includes traceId matching x-trace-id header
5. Every error response includes ISO 8601 timestamp
6. ErrorResponseDto code field accepts both "UA-USR-001" and "ENTITY_NOT_FOUND" formats
7. TraceIdMiddleware sets x-trace-id header on all routes
8. ValidationPipe returns ErrorResponseDto-shaped errors on validation failure
9. Old ErrorFilter is removed; no double-handling
10. All existing tests pass (with updated error shape assertions)

## Estimated Effort

- **New files**: 6 source + 6 test files = ~350 lines
- **Modified files**: 2 files = ~20 lines
- **Test assertions updated**: ~15-20 existing specs
- **Total**: ~400 lines, 8 files
