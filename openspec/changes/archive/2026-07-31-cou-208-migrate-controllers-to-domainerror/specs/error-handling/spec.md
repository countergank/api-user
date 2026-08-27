# Delta for error-handling

## ADDED Requirements

### Requirement: Services use DomainError.fromKind for all domain errors

The system MUST throw `DomainError.fromKind(ErrorKind.*)` in all services instead of throwing legacy error classes. This eliminates legacy error class usage in service layers.

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

## MODIFIED Requirements

### Requirement: Controllers delegate errors without try/catch

The system MUST have controllers that delegate error handling entirely to AllExceptionsFilter without catching domain errors. All try/catch blocks that catch domain errors MUST be removed from controllers.

(Previously: Controllers caught domain errors in try/catch blocks, then re-threw HttpException)

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

### Requirement: AllExceptionsFilter translates error messages via i18n

The system MUST translate `DomainError` messages using i18n service respecting `Accept-Language` header values (es/en/pt) with fallback to default message when no translation exists. Also MUST handle legacy `ErrorBase` and `HttpException` branches with i18n where applicable.

(Previously: AllExceptionsFilter produced hardcoded English error messages)

#### Scenario: AllExceptionsFilter translates DomainError via i18n

- GIVEN a `DomainError` with i18n service available
- WHEN AllExceptionsFilter catches the error
- THEN response message MUST be translated via `I18nService.translate('errors.USER_NOT_FOUND', lang)` according to `Accept-Language` header
- AND message MUST be in es/en/pt language code when available

#### Scenario: AllExceptionsFilter falls back to default message

- GIVEN a `DomainError` without translation key in i18n service
- WHEN AllExceptionsFilter catches the error
- THEN response message MUST use hardcoded fallback message instead of crashing
- AND response should still contain complete ErrorResponseDto format

#### Scenario: AllExceptionsFilter handles i18n for HttpException

- GIVEN an `HttpException` with i18n service available
- WHEN AllExceptionsFilter catches the error
- THEN response message SHOULD use i18n translation if key exists
- AND message MUST respect `Accept-Language` header

## REMOVED Requirements

### Requirement: Services throw legacy error classes

(Reason: Legacy error classes are replaced by DomainError.fromKind pattern for standardized error handling)
(Migration: Update all services, tests, and controllers to use DomainError instead. Remove references to UserNotFoundError, UserEmailAlreadyExistsError, AppVersionNotFoundError, UserPopulateError.)

### Requirement: Controllers catch domain errors in try/catch

(Reason: DomainError migration eliminates need for try/catch at controller level - errors propagate directly to AllExceptionsFilter)
(Migration: Remove try/catch blocks from all controllers, remove legacy error class imports and instanceof checks.)

## RENAMED Requirements

*(No requirements renamed in this change)*

## REMOVED Files

- `src/user/errors/error-instances.error.ts` – Contains legacy error class definitions for UserNotFoundError, UserEmailAlreadyExistsError, UserNameAlreadyExistsError
- `src/user/errors/error-instances.spec.ts` – Tests for legacy user error classes
- `src/user/errors/errors.spec.ts` – Legacy error class tests
- `src/app/errors/error-instances.error.ts` – Contains legacy AppVersionNotFoundError class (if no remaining consumers)
- `src/app/errors/error-instances.spec.ts` – Tests for legacy AppVersionNotFoundError

## Notes

- Migration from error-instances to error-classes is handled separately (different change)
- UserPopulateError in user.repository.ts remains but is replaced with DomainError.fromKind(ErrorKind.INTERNAL)