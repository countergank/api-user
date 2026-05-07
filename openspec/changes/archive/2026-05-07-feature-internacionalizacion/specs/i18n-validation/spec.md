# i18n-validation Specification

## Purpose

Provides multilingual validation messages for class-validator in the API-User system, supporting Spanish (es), English (en), and Portuguese (pt).

## Requirements

### Requirement: class-validator Message Translation

The system SHALL translate class-validator error messages based on the active language.

#### Scenario: Validation error in English
- GIVEN the active language is `en`
- AND a DTO field `email` fails `IsEmail` validation
- WHEN validation is performed
- THEN the system MUST return message `email must be an email` (English)

#### Scenario: Validation error in Portuguese
- GIVEN the active language is `pt`
- AND a DTO field `password` fails `MinLength(8)` validation
- WHEN validation is performed
- THEN the system MUST return message `senha deve ter no mínimo 8 caracteres` (Portuguese)

#### Scenario: Validation error in Spanish (default)
- GIVEN the active language is `es` (or not specified)
- AND a DTO field `name` fails `IsNotEmpty` validation
- WHEN validation is performed
- THEN the system MUST return message `name no debe estar vacío` (Spanish)

### Requirement: Custom Validation Decorators

The system SHALL support custom validation decorators with multilingual messages.

#### Scenario: Password strength validation in English
- GIVEN the active language is `en`
- AND a password fails the custom `IsStrongPassword` validation
- WHEN validation is performed
- THEN the system MUST return the English translation from `PASSWORD_MESSAGES`

#### Scenario: Password strength validation in Portuguese
- GIVEN the active language is `pt`
- AND a password fails the custom `IsStrongPassword` validation
- WHEN validation is performed
- THEN the system MUST return the Portuguese translation from `PASSWORD_MESSAGES`

### Requirement: Validation Message Interpolation

The system SHALL support interpolation in validation messages.

#### Scenario: MinLength message with interpolation
- GIVEN the active language is `en`
- AND a field fails `MinLength(8)` validation
- WHEN validation is performed
- THEN the message MUST include the required length (e.g., `must be at least 8 characters`)

#### Scenario: Password validation with context
- GIVEN the active language is `es`
- AND password fails with code `PASSWORD_TOO_SHORT`
- WHEN validation message is resolved
- THEN the system MUST use the full message from `PASSWORD_MESSAGES.es`
