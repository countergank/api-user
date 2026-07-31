# error-handling Specification

## Overview & Scope

This capability defines the unified error handling system for the api-user service:

- ErrorResponseDto with traceId and timestamp for all errors
- TraceIdMiddleware that captures request ID and sets x-trace-id header
- AllExceptionsFilter that catches and formats all exceptions using ErrorResponseDto
- DomainError class with ErrorKind registry for standardized error codes
- ValidationPipe that produces ErrorResponseDto-shaped validation errors
- Services and repositories throw `DomainError.fromKind(ErrorKind.*)` instead of legacy error classes
- Controllers delegate error handling entirely to AllExceptionsFilter (zero try/catch blocks)
- AllExceptionsFilter translates error messages via i18n respecting `Accept-Language` (es/en/pt) with fallback to default message

Established in COU-203 (Phase 1 foundation: ErrorResponseDto, TraceIdMiddleware, AllExceptionsFilter, DomainError, ValidationPipe) and completed in COU-208 (full migration from legacy error classes to `DomainError.fromKind` pattern across user/app services, repository, and controllers, plus i18n translation of error messages).

## ErrorResponseDto

### Schema
```typescript
interface ErrorResponseDto {
    statusCode: number;
    code: string; // Accepts both "ENTITY_NOT_FOUND" and "UA-USR-001" formats
    message: string;
    details?: any; // Optional error details
    traceId: string;
    timestamp: string;
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| statusCode | number | YES | HTTP status code (e.g., 404, 400, 500) |
| code | string | YES | Error code - accepts both backend-template format and api-user UA-{GROUP}-{CODE} format |
| message | string | YES | Error message, i18n-translated respecting Accept-Language with fallback to default |
| details | any | NO | Additional error context or validation error details |
| traceId | string | YES | Unique trace ID for request correlation (provided by TraceIdMiddleware) |
| timestamp | string | YES | ISO 8601 timestamp of error occurrence |

### Validation Rules

- `statusCode` MUST be a valid HTTP status code
- `code` MUST be present and non-empty (accepts either format)
- `message` MUST be present and translated (fallback to hardcoded message)
- `traceId` MUST be populated from x-trace-id header
- `timestamp` MUST be ISO 8601 format
- `details` MAY be omitted but included for validation errors

## TraceIdMiddleware

### Behavior

The middleware extracts request context and sets the `x-trace-id` response header:

- If `request.id` exists (from hyperid/nestjs-cls), use it as traceId
- Sets header: `x-trace-id: <request.id>`
- Applied globally via `AppModule` using `consumer.apply(...).forRoutes('*')`
- Preserves existing hyperid configuration from main.ts

### Registration

```typescript
// In AppModule
TraceIdMiddleware.register(consumer);
```

### Format

Header format: `x-trace-id`

Sample value: `req_abc123def456`

## AllExceptionsFilter

### Catch Priority

Filter catches exceptions in this order:

1. **DomainError** → Convert to HttpException with ErrorResponseDto format, message translated via i18n
2. **HttpException** → Preserve existing behavior but enrich with traceId/timestamp; translate message via i18n if a translation key exists
3. **ErrorBase** → Convert to HttpException with ErrorResponseDto format
4. **Error** → Convert to generic HttpException with ErrorResponseDto format

### Behavior

- Injects traceId from request (set by TraceIdMiddleware) into ErrorResponseDto
- Injects ISO 8601 timestamp into ErrorResponseDto
- Translates `DomainError` messages via `I18nService.translate('errors.{kind}', lang)` where `lang` is resolved from the `Accept-Language` request header (es/en/pt)
- Falls back to the hardcoded default message when no translation exists (MUST NOT crash)
- Handles i18n for `HttpException` messages when the message matches a translation key
- Language resolution uses the request's `Accept-Language` header (the filter cannot rely on `I18nContext.current()` because AsyncLocalStorage context is lost inside exception filters)
- Logs to nestjs-pino with appropriate error levels:
  - WARN for recoverable errors (HttpException)
  - ERROR for unrecoverable errors (ErrorBase, Error)
- Registered as `APP_FILTER` provider in AppModule
- Overrides default `app.useGlobalFilters` registration

### Response Format

All exceptions return ErrorResponseDto regardless of type:

```json
{
    "statusCode": 404,
    "code": "UA-USR-001",
    "message": "Usuario no encontrado",
    "details": null,
    "traceId": "req_abc123def456",
    "timestamp": "2026-01-01T12:00:00.000Z"
}
```

## DomainError

### Class Structure

```typescript
class DomainError extends Error {
    readonly kind: ErrorKind;
    readonly code: string; // UA-{GROUP}-{CODE} format
    readonly i18n?: I18nService;
    
    constructor(kind: ErrorKind, i18n?: I18nService);
    
    static fromKind(name: string, i18n?: I18nService): DomainError;
    
    getMessage(): string; // Translated if i18n provided, else hardcoded
}
```

### ErrorKind Registry

Registry structure:

```typescript
const ErrorKind = {
    ENTITY_NOT_FOUND: "ENTITY_NOT_FOUND",      // backend-template style
    UA_AUTH_001: "UA-AUTH-001",               // api-user style
    UA_USR_001: "UA-USR-001",                 // api-user style
    // ... more entries
};
```

### Static Factory

`DomainError.fromKind(name: string, i18n?: I18nService): DomainError`
- Accepts both "ENTITY_NOT_FOUND" and "UA-AUTH-001" format strings
- Resolves to appropriate ErrorKind from registry
- Optional I18nService for message translation
- Falls back to hardcoded messages if i18n not provided

### Message Resolution

- With I18nService: `I18nService.translate('errors.{kind}', lang)` (e.g. `I18nService.translate('errors.USER_NOT_FOUND', lang)`)
- Without I18nService: fallback to hardcoded English message

## Service & Repository Error Throwing

### Requirement: Services use DomainError.fromKind for all domain errors

The system MUST throw `DomainError.fromKind(ErrorKind.*)` in all services and the repository instead of throwing legacy error classes. This eliminates legacy error class usage in service layers.

#### Scenario: User service throws DomainError

- GIVEN a user service method receiving invalid input (e.g., user ID not found)
- WHEN the service attempts to find or modify the user
- THEN service MUST throw `DomainError.fromKind(ErrorKind.USER_NOT_FOUND, { id })` instead of legacy `UserNotFoundError`

#### Scenario: Repository throws DomainError

- GIVEN a repository operation fails (e.g., population error in user seeder)
- WHEN repository attempts to load related entities
- THEN repository MUST throw `DomainError.fromKind(ErrorKind.INTERNAL)` instead of legacy `UserPopulateError`

#### Scenario: App service throws DomainError

- GIVEN application startup process attempts to load missing version
- WHEN version service processes version identifier
- THEN service MUST throw `DomainError.fromKind(ErrorKind.APP_VERSION_NOT_FOUND, { version })` instead of legacy `AppVersionNotFoundError`

## Controller Error Delegation

### Requirement: Controllers delegate errors without try/catch

The system MUST have controllers that delegate error handling entirely to AllExceptionsFilter without catching domain errors. All try/catch blocks that catch domain errors MUST be removed from controllers.

#### Scenario: Controller delegates User service errors

- GIVEN a controller endpoint calls user service with invalid input
- WHEN controller delegates to service method
- THEN controller MUST NOT catch `DomainError`, MUST allow exception to propagate to AllExceptionsFilter
- AND service `DomainError` MUST be caught by AllExceptionsFilter before HttpException

#### Scenario: Controller delegates App service errors

- GIVEN a controller endpoint calls app service with missing resource
- WHEN controller delegates to service method
- THEN controller MUST NOT catch `DomainError`, MUST allow exception to propagate to AllExceptionsFilter
- AND service `DomainError` MUST be caught by AllExceptionsFilter before HttpException

## ValidationPipe

### Configuration

Custom ValidationPipe registered in AppModule that:

- Extends `ValidationPipe` with custom `exceptionFactory`
- Produces ErrorResponseDto-shaped validation errors instead of default format
- Preserves existing validation rules and decorators
- Integrates with existing i18n system for validation messages

### Exception Factory

```typescript
exceptionFactory(errors: ValidationError[]): ErrorResponseDto {
    return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: "UA-VAL-001", // Validation error code
        message: "Validation failed",
        details: errors, // Array of validation errors
        traceId: extractTraceId(), // From request context
        timestamp: new Date().toISOString()
    };
}
```

### Validation Error Format

Validation errors return:

```json
{
    "statusCode": 400,
    "code": "UA-VAL-001",
    "message": "Validation failed",
    "details": [
        {
            "property": "email",
            "constraints": ["isEmail"],
            "children": []
        }
    ],
    "traceId": "req_abc123def456",
    "timestamp": "2026-01-01T12:00:00.000Z"
}
```

## Testing Scenarios

### Positive Scenarios

#### TraceId Header Presence
- GIVEN a request without x-trace-id header
- WHEN request is processed
- THEN response MUST include x-trace-id header with generated value

#### Validation Error Format
- GIVEN a DTO with validation errors
- WHEN validation pipe processes the request
- THEN error response MUST contain ErrorResponseDto with traceId and timestamp

#### User Service Throws DomainError
- GIVEN a user service method with invalid input (user ID not found)
- WHEN the service attempts to find or modify the user
- THEN error response MUST contain ErrorResponseDto with DomainError kind (e.g. USER_NOT_FOUND)

#### Repository Throws DomainError
- GIVEN a repository operation fails (e.g., population error in user seeder)
- WHEN repository attempts to load related entities
- THEN repository MUST throw DomainError.fromKind(ErrorKind.INTERNAL)

#### App Service Throws DomainError
- GIVEN application startup attempts to load a missing version
- WHEN version service processes the version identifier
- THEN service MUST throw DomainError.fromKind(ErrorKind.APP_VERSION_NOT_FOUND)

#### DomainError Translation
- GIVEN a DomainError with i18n service available
- WHEN error is caught by AllExceptionsFilter
- THEN error message MUST be translated via `I18nService.translate('errors.USER_NOT_FOUND', lang)` respecting the `Accept-Language` header

#### HttpException Translation
- GIVEN an HttpException whose message matches an i18n error key
- WHEN error is caught by AllExceptionsFilter
- THEN response message SHOULD use the i18n translation respecting `Accept-Language`

#### ValidationPipe Error Isolation
- GIVEN a request with mixed valid and invalid fields
- WHEN validation pipe processes request
- THEN error response MUST include all validation failures, not just first

### Negative Scenarios

#### TraceId Generation Failure
- GIVEN a request with invalid CLS context
- WHEN TraceIdMiddleware processes request
- THEN should fallback to UUID or preserve request ID if available

#### i18n Message Missing
- GIVEN a DomainError without translation key
- WHEN error is processed and i18n service provided
- THEN should fallback to hardcoded message instead of crashing

#### Filter Exception Chain
- GIVEN an uncaught exception in controller
- WHEN AllExceptionsFilter processes error
- THEN should convert Error to HttpException without losing original message

## Acceptance Criteria

All criteria MUST pass before apply is complete:

1. **ErrorResponseDto Shape**: All errors MUST return ErrorResponseDto with all required fields (statusCode, code, message, traceId, timestamp)
2. **TraceId Consistency**: traceId in response MUST match x-trace-id header value
3. **Filter Priority**: DomainError MUST be caught before HttpException, ErrorBase, and Error
4. **Code Format**: Error codes MUST accept both "ENTITY_NOT_FOUND" and "UA-{GROUP}-{CODE}" formats
5. **i18n Integration**: DomainError messages MUST use I18nService when available, translated per `Accept-Language` with fallback to default message
6. **Validation Format**: Validation errors MUST return ErrorResponseDto shape
7. **Global Application**: All controllers MUST have zero try/catch blocks for error handling
8. **Middleware Coverage**: All routes MUST pass through TraceIdMiddleware
9. **Filter Registration**: AllExceptionsFilter MUST be registered as APP_FILTER provider
10. **Error Logging**: All errors MUST be logged to nestjs-pino with appropriate levels
11. **Legacy Error Removal**: Services and repositories MUST throw `DomainError.fromKind` instead of legacy error classes (UserNotFoundError, UserEmailAlreadyExistsError, UserNameAlreadyExistsError, AppVersionNotFoundError, UserPopulateError), and legacy error class files MUST be removed

## Rollback Plan

During rollback:

1. Remove ErrorResponseDto, TraceIdMiddleware, AllExceptionsFilter, DomainError, ValidationPipe registrations
2. Restore previous ErrorFilter global registration in main.ts
3. Ensure controllers retain existing try/catch blocks
4. Restore legacy error classes (UserNotFoundError, UserEmailAlreadyExistsError, UserNameAlreadyExistsError, AppVersionNotFoundError, UserPopulateError) and their usage in services/controllers
5. Remove or disable new error handling infrastructure files

## Dependencies

- `nestjs-cls` (already installed and configured)
- `hyperid` (already installed for request ID generation)
- `@nestjs/swagger` (for ErrorResponseDto annotation)
- `nestjs-i18n` (existing i18n module)
- `nestjs-pino` (for error logging)

## Glossary

| Term | Definition |
|------|------------|
| ErrorResponseDto | Unified error response format with traceId and timestamp |
| x-trace-id | HTTP header containing request trace ID |
| nestjs-cls | NestJS Context Storage for request context propagation |
| hyperid | Library for generating request IDs |
| i18n | Internationalization service for multi-language message support |
| nestjs-pino | NestJS adapter for Pino logging framework |

*(Generated spec for COU-203 error handling system, extended by COU-208 DomainError migration and i18n translation)*
