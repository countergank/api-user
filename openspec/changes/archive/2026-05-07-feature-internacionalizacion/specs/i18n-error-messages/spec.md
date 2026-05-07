# i18n-error-messages Specification

## Purpose

Translates error messages in the API-User system to support Spanish (es), English (en), and Portuguese (pt) while maintaining backward compatibility with existing error codes.

## Requirements

### Requirement: Error Dictionary Translation

The system SHALL translate error messages using translation keys instead of hardcoded strings.

#### Scenario: Translate user error in English
- GIVEN the active language is `en`
- AND error code `APP-USER-001` maps to key `errors.USER_NOT_FOUND`
- WHEN an error with code `APP-USER-001` is thrown
- THEN the system MUST return message `User not found` (English)

#### Scenario: Translate user error in Portuguese
- GIVEN the active language is `pt`
- AND error code `APP-USER-001` maps to key `errors.USER_NOT_FOUND`
- WHEN an error with code `APP-USER-001` is thrown
- THEN the system MUST return message `Usuário não encontrado` (Portuguese)

#### Scenario: Translate common error in Spanish (default)
- GIVEN the active language is `es` (or not specified)
- AND error code `APP-COMMON-001` maps to key `errors.INTERNAL_ERROR`
- WHEN an error with code `APP-COMMON-001` is thrown
- THEN the system MUST return message `Error interno del servidor` (Spanish)

### Requirement: Error Code Preservation

The system MUST preserve existing error codes for backward compatibility.

#### Scenario: Error response structure
- GIVEN an error with code `APP-USER-001` is thrown
- WHEN the error is formatted in the response
- THEN the system MUST include `code: "APP-USER-001"` in the response
- AND the system MUST include the translated `message` in the active language

### Requirement: Error Dictionary Structure

The system SHALL use the pattern `{ es: '...', en: '...', pt: '...' }` for error dictionaries.

#### Scenario: Existing PASSWORD_MESSAGES pattern
- GIVEN the `PASSWORD_MESSAGES` dictionary in `password-validation.interface.ts`
- WHEN the internationalization is implemented
- THEN the system MUST extend the pattern to include `pt: '...'` for each message
- AND the system MUST use the active language to select the appropriate message
