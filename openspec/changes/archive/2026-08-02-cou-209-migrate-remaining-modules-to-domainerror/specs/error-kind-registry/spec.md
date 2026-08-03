# error-kind-registry Specification

## Purpose

This capability defines the extended ErrorKind enum that serves as the single source of truth for all domain errors across the application. It adds the missing error kinds covering auth, email, parameters, guards, user-profile, and app service errors, replacing raw HttpException throws and legacy error classes.

## Requirements

### Requirement: ErrorKind registry must contain all domain error kinds

The system MUST have ErrorKind entries for every domain error across auth, email, parameters, guards, user-profile, and app service, in addition to the existing entries from COU-208. This eliminates raw HttpException throws and legacy error class usage.

#### Scenario: Auth service uses ErrorKind.EMAIL_OR_USERNAME_EXISTS

- GIVEN auth service registration with duplicate email or username
- WHEN register attempts to create user with existing credentials
- THEN service MUST throw DomainError.fromKind(ErrorKind.EMAIL_OR_USERNAME_EXISTS) for credential conflicts

#### Scenario: Auth service uses ErrorKind.INVALID_CREDENTIALS

- GIVEN auth service login with wrong email/username or password
- WHEN login validates credentials
- THEN service MUST throw DomainError.fromKind(ErrorKind.INVALID_CREDENTIALS) for failed authentication

#### Scenario: Auth service uses ErrorKind.ACCOUNT_LOCKED

- GIVEN auth service login when account is locked due to failed attempts
- WHEN login validates locked user account
- THEN service MUST throw DomainError.fromKind(ErrorKind.ACCOUNT_LOCKED) for locked account access

#### Scenario: Auth service uses ErrorKind.ACCOUNT_INACTIVE

- GIVEN auth service login for an inactive (deactivated) account
- WHEN login validates account status
- THEN service MUST throw DomainError.fromKind(ErrorKind.ACCOUNT_INACTIVE) for inactive accounts

#### Scenario: Auth service uses ErrorKind.EXPIRED_RESET_TOKEN

- GIVEN auth service password reset with expired token
- WHEN resetPassword processes invalid token
- THEN service MUST throw DomainError.fromKind(ErrorKind.EXPIRED_RESET_TOKEN) for expired reset tokens

#### Scenario: Auth service uses ErrorKind.EXPIRED_VERIFICATION_TOKEN

- GIVEN auth service verification with expired token
- WHEN verifyEmail processes invalid token
- THEN service MUST throw DomainError.fromKind(ErrorKind.EXPIRED_VERIFICATION_TOKEN) for expired verification tokens

#### Scenario: Auth service uses ErrorKind.EXPIRED_CONFIRMATION_TOKEN

- GIVEN auth service email change confirmation with expired token
- WHEN confirmEmailChange processes invalid token
- THEN service MUST throw DomainError.fromKind(ErrorKind.EXPIRED_CONFIRMATION_TOKEN) for expired confirmation tokens

#### Scenario: Auth service uses ErrorKind.NO_PENDING_EMAIL_CHANGE

- GIVEN auth service email change when no change is pending
- WHEN confirmEmailChange processes request without pending change
- THEN service MUST throw DomainError.fromKind(ErrorKind.NO_PENDING_EMAIL_CHANGE) for missing pending changes

#### Scenario: Auth service uses ErrorKind.INVALID_TOKEN

- GIVEN auth service refresh token with invalid JWT
- WHEN refreshToken validates the token
- THEN service MUST throw DomainError.fromKind(ErrorKind.INVALID_TOKEN) for invalid JWT tokens

#### Scenario: Auth service uses ErrorKind.INVALID_REFRESH_TOKEN

- GIVEN auth service refresh token with invalid refresh token
- WHEN refreshToken validates the refresh token
- THEN service MUST throw DomainError.fromKind(ErrorKind.INVALID_REFRESH_TOKEN) for invalid refresh tokens

#### Scenario: Email template service uses ErrorKind.TEMPLATE_SLUG_ALREADY_EXISTS

- GIVEN email template service finds template with duplicate slug
- WHEN create attempts to add existing slug
- THEN service MUST throw DomainError.fromKind(ErrorKind.TEMPLATE_SLUG_ALREADY_EXISTS) for slug conflicts

#### Scenario: Email template service uses ErrorKind.TEMPLATE_NOT_FOUND

- GIVEN email template service resolves non-existent template
- WHEN resolve attempts to fetch missing template
- THEN service MUST throw DomainError.fromKind(ErrorKind.TEMPLATE_NOT_FOUND) for missing templates

#### Scenario: Email template service uses ErrorKind.TEMPLATE_FILE_NOT_FOUND

- GIVEN email template service loads default template file
- WHEN loadDefaultHtml attempts to access non-existent template
- THEN service MUST throw DomainError.fromKind(ErrorKind.TEMPLATE_FILE_NOT_FOUND) for missing files

#### Scenario: Parameters service uses ErrorKind.PARAMETER_NOT_FOUND

- GIVEN parameters admin controller validates parameter key before update
- WHEN update attempts to access non-existent parameter
- THEN service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_NOT_FOUND) for missing parameters

#### Scenario: Parameters service uses ErrorKind.PARAMETER_OVERRIDDEN

- GIVEN parameters admin update for a parameter overridden by environment
- WHEN update attempts to modify env-overridden parameter
- THEN service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_OVERRIDDEN) for env-overridden parameters

#### Scenario: Parameters service uses ErrorKind.PARAMETER_VALUE_INVALID

- GIVEN parameters service receives invalid type value
- WHEN set attempts to store non-numeric value
- THEN service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_VALUE_INVALID) for type mismatches

#### Scenario: Guards use ErrorKind.INVALID_TOKEN

- GIVEN jwt-auth guard receives invalid token
- WHEN canActivate attempts to decode malformed token
- THEN guard MUST throw DomainError.fromKind(ErrorKind.INVALID_TOKEN) for invalid tokens

#### Scenario: Guards use ErrorKind.FORBIDDEN

- GIVEN roles/permissions guard user lacks required role or permission
- WHEN canActivate evaluates user authorization
- THEN guard MUST throw DomainError.fromKind(ErrorKind.FORBIDDEN) for insufficient permissions

#### Scenario: User profile uses ErrorKind.CURRENT_PASSWORD_INCORRECT

- GIVEN user profile change password with wrong current password
- WHEN changePassword validates current password
- THEN controller MUST throw DomainError.fromKind(ErrorKind.CURRENT_PASSWORD_INCORRECT) for wrong current password

#### Scenario: User service uses ErrorKind.EMAIL_ALREADY_EXISTS

- GIVEN user service requests email change to an email already in use
- WHEN requestEmailChange validates target email
- THEN service MUST throw DomainError.fromKind(ErrorKind.EMAIL_ALREADY_EXISTS) for duplicate email

#### Scenario: User repository uses ErrorKind.USER_NOT_FOUND

- GIVEN user repository update for a non-existent user
- WHEN update attempts to modify missing user
- THEN repository MUST throw DomainError.fromKind(ErrorKind.USER_NOT_FOUND) for missing users

#### Scenario: App service uses ErrorKind.MICROSERVICE_UNAVAILABLE

- GIVEN app service messageMicroservice when example microservice is disabled or unavailable
- WHEN messageMicroservice attempts to send message
- THEN service MUST throw DomainError.fromKind(ErrorKind.MICROSERVICE_UNAVAILABLE) for unavailable microservice

#### Scenario: User service uses ErrorKind.ENTITY_NAME_ALREADY_EXISTS

- GIVEN user service creates user with duplicate username
- WHEN createWithRole attempts to create with existing username
- THEN service MUST throw DomainError.fromKind(ErrorKind.ENTITY_NAME_ALREADY_EXISTS) for username conflicts

#### Scenario: User repository uses ErrorKind.INTERNAL

- GIVEN user repository fails to populate related entities
- WHEN findWithRelations attempts to load nested data
- THEN repository MUST throw DomainError.fromKind(ErrorKind.INTERNAL) for database errors

#### Scenario: App service uses ErrorKind.APP_VERSION_NOT_FOUND

- GIVEN app service attempts to load non-existent version
- WHEN loadVersion processes invalid version identifier
- THEN service MUST throw DomainError.fromKind(ErrorKind.APP_VERSION_NOT_FOUND) for missing versions

### Requirement: Parameters controller delegates errors to service

The system MUST move error handling out of the parameter-admin controller into parameter.service.ts, so the controller delegates cleanly to the service without try/catch or direct HttpException throws, consistent with the other controllers.

#### Scenario: Parameter admin controller delegates

- GIVEN parameter admin controller endpoint with invalid parameter key or value
- WHEN controller calls parameter service method
- THEN controller MUST NOT catch errors or throw HttpException directly
- AND service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_*) propagated to AllExceptionsFilter

### Requirement: defaults.decorator Swagger types point to ErrorResponseDto

The system MUST re-point the Swagger response DTOs in defaults.decorator.ts from the legacy bad-request.error.ts / internal-server.error.ts types to ErrorResponseDto, after those legacy DTO files are removed.

#### Scenario: Swagger docs use ErrorResponseDto

- GIVEN an endpoint decorated with applyDocsDecorators
- WHEN Swagger UI renders the error responses
- THEN the documented response type MUST be ErrorResponseDto
- AND no reference to bad-request.error.ts or internal-server.error.ts MUST remain

## Testing Scenarios

### Positive Scenarios

#### ErrorKind.EMAIL_OR_USERNAME_EXISTS
- GIVEN auth service with duplicate email/username
- WHEN register is called with existing credentials
- THEN service MUST throw DomainError.fromKind(ErrorKind.EMAIL_OR_USERNAME_EXISTS)

#### ErrorKind.INVALID_CREDENTIALS
- GIVEN auth login with wrong credentials
- WHEN login is called
- THEN service MUST throw DomainError.fromKind(ErrorKind.INVALID_CREDENTIALS)

#### ErrorKind.ACCOUNT_LOCKED
- GIVEN user account with too many failed login attempts
- WHEN login is attempted while locked
- THEN service MUST throw DomainError.fromKind(ErrorKind.ACCOUNT_LOCKED)

#### ErrorKind.ACCOUNT_INACTIVE
- GIVEN an inactive user account
- WHEN login is attempted
- THEN service MUST throw DomainError.fromKind(ErrorKind.ACCOUNT_INACTIVE)

#### ErrorKind.EXPIRED_RESET_TOKEN
- GIVEN password reset token that has expired
- WHEN resetPassword is called with expired token
- THEN service MUST throw DomainError.fromKind(ErrorKind.EXPIRED_RESET_TOKEN)

#### ErrorKind.EXPIRED_VERIFICATION_TOKEN
- GIVEN verification token that has expired
- WHEN verifyEmail is called with expired token
- THEN service MUST throw DomainError.fromKind(ErrorKind.EXPIRED_VERIFICATION_TOKEN)

#### ErrorKind.EXPIRED_CONFIRMATION_TOKEN
- GIVEN confirmation token that has expired
- WHEN confirmEmailChange is called with expired token
- THEN service MUST throw DomainError.fromKind(ErrorKind.EXPIRED_CONFIRMATION_TOKEN)

#### ErrorKind.NO_PENDING_EMAIL_CHANGE
- GIVEN no pending email change exists
- WHEN confirmEmailChange is called
- THEN service MUST throw DomainError.fromKind(ErrorKind.NO_PENDING_EMAIL_CHANGE)

#### ErrorKind.INVALID_TOKEN
- GIVEN JWT token with invalid signature
- WHEN jwtAuthGuard or refreshToken validates token
- THEN guard/service MUST throw DomainError.fromKind(ErrorKind.INVALID_TOKEN)

#### ErrorKind.INVALID_REFRESH_TOKEN
- GIVEN invalid refresh token
- WHEN refreshToken validates refresh token
- THEN service MUST throw DomainError.fromKind(ErrorKind.INVALID_REFRESH_TOKEN)

#### ErrorKind.TEMPLATE_SLUG_ALREADY_EXISTS
- GIVEN email template with duplicate slug
- WHEN create is called with existing slug
- THEN service MUST throw DomainError.fromKind(ErrorKind.TEMPLATE_SLUG_ALREADY_EXISTS)

#### ErrorKind.TEMPLATE_NOT_FOUND
- GIVEN non-existent template slug
- WHEN resolve is called with missing slug
- THEN service MUST throw DomainError.fromKind(ErrorKind.TEMPLATE_NOT_FOUND)

#### ErrorKind.TEMPLATE_FILE_NOT_FOUND
- GIVEN missing default template file
- WHEN loadDefaultHtml attempts to load template
- THEN service MUST throw DomainError.fromKind(ErrorKind.TEMPLATE_FILE_NOT_FOUND)

#### ErrorKind.PARAMETER_NOT_FOUND
- GIVEN non-existent parameter key
- WHEN update is called with invalid key
- THEN service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_NOT_FOUND)

#### ErrorKind.PARAMETER_OVERRIDDEN
- GIVEN parameter overridden by environment
- WHEN update is called on it
- THEN service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_OVERRIDDEN)

#### ErrorKind.PARAMETER_VALUE_INVALID
- GIVEN invalid parameter value type
- WHEN update is called with wrong type
- THEN service MUST throw DomainError.fromKind(ErrorKind.PARAMETER_VALUE_INVALID)

#### ErrorKind.FORBIDDEN
- GIVEN user lacks required role/permission
- WHEN canActivate evaluates authorization
- THEN guard MUST throw DomainError.fromKind(ErrorKind.FORBIDDEN)

#### ErrorKind.CURRENT_PASSWORD_INCORRECT
- GIVEN user profile change password with wrong current password
- WHEN changePassword is called
- THEN controller MUST throw DomainError.fromKind(ErrorKind.CURRENT_PASSWORD_INCORRECT)

#### ErrorKind.EMAIL_ALREADY_EXISTS
- GIVEN email change request to an already-used email
- WHEN requestEmailChange is called
- THEN service MUST throw DomainError.fromKind(ErrorKind.EMAIL_ALREADY_EXISTS)

#### ErrorKind.MICROSERVICE_UNAVAILABLE
- GIVEN example microservice disabled or unavailable
- WHEN messageMicroservice is called
- THEN service MUST throw DomainError.fromKind(ErrorKind.MICROSERVICE_UNAVAILABLE)

#### ErrorKind.USER_NOT_FOUND
- GIVEN non-existent user ID
- WHEN user repository update is called
- THEN repository MUST throw DomainError.fromKind(ErrorKind.USER_NOT_FOUND)

#### ErrorKind.ENTITY_NAME_ALREADY_EXISTS
- GIVEN duplicate username
- WHEN createWithRole attempts with existing username
- THEN service MUST throw DomainError.fromKind(ErrorKind.ENTITY_NAME_ALREADY_EXISTS)

#### ErrorKind.INTERNAL
- GIVEN database connection error
- WHEN findWithRelations is called
- THEN repository MUST throw DomainError.fromKind(ErrorKind.INTERNAL)

#### ErrorKind.APP_VERSION_NOT_FOUND
- GIVEN invalid app version
- WHEN loadVersion is called with missing version
- THEN service MUST throw DomainError.fromKind(ErrorKind.APP_VERSION_NOT_FOUND)

## REMOVED Files

- `src/common/errors/error-base/error-base.ts` – Legacy ErrorBase class (no longer thrown anywhere)
- `src/common/errors/error-base/error-base.enums.ts` – Legacy error enums
- `src/common/errors/error-base/error-base.helpers.ts` – Legacy statusKey helper
- `src/common/errors/error-base/error-base.types.ts` – Legacy error types
- `src/common/errors/error/error-instances.error.ts` – GenericError + CommonErrors (only Swagger examples)
- `src/common/errors/error/error.dictionary.ts` – Legacy codes/messages dictionary
- `src/app/errors/error-instances.error.ts` – AppError + AppErrors (dead chain, zero production consumers)
- `src/app/errors/error.dictionary.ts` – Legacy app codes (dead chain)
- `src/user/errors/error.dictionary.ts` – Legacy user codes (zero consumers since COU-208)
- `src/common/errors/error-filter.ts` – Legacy @Catch(ErrorBase, Error) filter (not registered; global filter is AllExceptionsFilter)
- `src/common/errors/bad-request.error.ts` – Legacy Swagger response DTO (replaced by ErrorResponseDto)
- `src/common/errors/internal-server.error.ts` – Legacy Swagger response DTO (replaced by ErrorResponseDto)
- `src/common/errors/account-locked.exception.ts` – Legacy AccountLockedException (replaced by ErrorKind.ACCOUNT_LOCKED after auth migration)

## Acceptance Criteria

All criteria MUST pass:

1. **ErrorKind Coverage**: New ErrorKind entries exist for every in-scope error: EMAIL_OR_USERNAME_EXISTS, INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_INACTIVE, EXPIRED_RESET_TOKEN, EXPIRED_VERIFICATION_TOKEN, EXPIRED_CONFIRMATION_TOKEN, NO_PENDING_EMAIL_CHANGE, INVALID_TOKEN, INVALID_REFRESH_TOKEN, CURRENT_PASSWORD_INCORRECT, EMAIL_ALREADY_EXISTS, FORBIDDEN, TEMPLATE_SLUG_ALREADY_EXISTS, TEMPLATE_NOT_FOUND, TEMPLATE_FILE_NOT_FOUND, PARAMETER_NOT_FOUND, PARAMETER_OVERRIDDEN, PARAMETER_VALUE_INVALID, MICROSERVICE_UNAVAILABLE
2. **ErrorKind Structure**: Each ErrorKind entry has kind, group, code, statusCode, defaultMessage
3. **ErrorKind Registration**: All new kinds are importable from error-kind.ts
4. **DomainError Integration**: All in-scope services/guards throw DomainError.fromKind(ErrorKind.*) instead of HttpException
5. **Code Uniqueness**: ErrorKind codes are unique across UA-{GROUP}-{CODE} format
6. **No Legacy Usage**: Zero raw HttpException throws remain in in-scope services/controllers/guards (grep verification)
7. **AccountLocked Replaced**: AccountLockedException completely removed and replaced by ErrorKind.ACCOUNT_LOCKED
8. **Controller Delegation**: Parameter admin controller has zero try/catch and zero direct HttpException throws
9. **Swagger Re-pointed**: defaults.decorator.ts references ErrorResponseDto only; bad-request.error.ts and internal-server.error.ts removed

## Rollback Plan

During rollback:

1. Remove new ErrorKind entries from error-kind.ts
2. Restore legacy error classes (AccountLockedException, GenericError, etc.) from git history
3. Restore legacy error throws in all migrated services
4. Restore removed legacy error files from git history
5. Revert defaults.decorator.ts Swagger types to previous imports

## Dependencies

- `DomainError.fromKind()` implementation in domain.error.ts (COU-203)
- i18n-error-translations capability for translation keys
- AllExceptionsFilter in all-exceptions.filter.ts (COU-203)

## Glossary

| Term | Definition |
|------|------------|
| ErrorKind | Single source of truth for domain errors (key-value registry) |
| EMAIL_OR_USERNAME_EXISTS | Auth error for duplicate email/username during register |
| INVALID_CREDENTIALS | Auth error for failed login |
| ACCOUNT_LOCKED | Auth error for locked account (423) |
| ACCOUNT_INACTIVE | Auth error for inactive account (401) |
| EXPIRED_RESET_TOKEN | Auth error for expired password reset token |
| EXPIRED_VERIFICATION_TOKEN | Auth error for expired email verification token |
| EXPIRED_CONFIRMATION_TOKEN | Auth error for expired email change confirmation token |
| NO_PENDING_EMAIL_CHANGE | Auth error when no email change is pending |
| INVALID_TOKEN | Guard/service error for invalid JWT token |
| INVALID_REFRESH_TOKEN | Auth error for invalid refresh token |
| CURRENT_PASSWORD_INCORRECT | User profile error for wrong current password |
| EMAIL_ALREADY_EXISTS | User service error for duplicate target email |
| FORBIDDEN | Guard error for insufficient role/permission |
| TEMPLATE_SLUG_ALREADY_EXISTS | Email template error for duplicate slug |
| TEMPLATE_NOT_FOUND | Email template error for missing template |
| TEMPLATE_FILE_NOT_FOUND | Email template error for missing default file |
| PARAMETER_NOT_FOUND | Parameters error for missing parameter |
| PARAMETER_OVERRIDDEN | Parameters error for env-overridden parameter |
| PARAMETER_VALUE_INVALID | Parameters error for invalid value type |
| MICROSERVICE_UNAVAILABLE | App service error for unavailable example microservice |
| USER_NOT_FOUND | User/repository error for missing user |
| ENTITY_NAME_ALREADY_EXISTS | User service error for duplicate username |
| APP_VERSION_NOT_FOUND | App service error for missing version |
| INTERNAL | Generic internal error for unexpected issues |
