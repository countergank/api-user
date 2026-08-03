# i18n-error-translations Specification

## Purpose

This capability defines the i18n translation keys for every `ErrorKind` value in the registry after COU-209 (29 kinds) across en, es, and pt. It ensures the `AllExceptionsFilter` can translate every domain error message via the `errors.{ErrorKind.kind}` key pattern, respecting the Accept-Language header, and falls back to `ErrorKind.defaultMessage` when no translation exists.

Fifteen registry kinds already have matching translation keys from the legacy auth-style i18n usage; this change adds the 14 missing keys in all three languages so every `DomainError.fromKind(...)` call produces a localized message.

## Requirements

### Requirement: Every ErrorKind value has a translation key in all supported languages

The system MUST have an `errors.{kind}` translation key for every value in the ErrorKind registry, in en, es, and pt. The `AllExceptionsFilter` MUST resolve `DomainError` messages through `errors.${exception.kind.kind}` (implemented in `all-exceptions.filter.ts`) so that no in-scope domain error falls back to the English `defaultMessage`.

Keys already present (15): `USER_NOT_FOUND`, `VALIDATION_ERROR`, `INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`, `EMAIL_OR_USERNAME_EXISTS`, `ACCOUNT_INACTIVE`, `CURRENT_PASSWORD_INCORRECT`, `INVALID_REFRESH_TOKEN`, `NO_PENDING_EMAIL_CHANGE`, `INVALID_TOKEN`, `FORBIDDEN`, `ACCOUNT_LOCKED`, `EXPIRED_RESET_TOKEN`, `EXPIRED_VERIFICATION_TOKEN`, `EXPIRED_CONFIRMATION_TOKEN`.

Keys to be added (14): `INTERNAL`, `APP_ERROR`, `APP_VERSION_NOT_FOUND`, `ENTITY_NOT_FOUND`, `ENTITY_NAME_ALREADY_EXISTS`, `ENTITY_EMAIL_ALREADY_EXISTS`, `USER_ALREADY_DELETED`, `TEMPLATE_SLUG_ALREADY_EXISTS`, `TEMPLATE_NOT_FOUND`, `TEMPLATE_FILE_NOT_FOUND`, `PARAMETER_NOT_FOUND`, `PARAMETER_OVERRIDDEN`, `PARAMETER_VALUE_INVALID`, `MICROSERVICE_UNAVAILABLE`.

#### Scenario: Existing common kinds translate in English

- GIVEN a `DomainError` with kind `USER_NOT_FOUND`
- AND a request with `Accept-Language: en`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "User not found"

#### Scenario: Existing common kinds translate in Spanish

- GIVEN a `DomainError` with kind `VALIDATION_ERROR`
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Error de validación"

#### Scenario: New common kind INTERNAL translates in Portuguese

- GIVEN a `DomainError` with kind `INTERNAL`
- AND a request with `Accept-Language: pt`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Erro interno do servidor"

### Requirement: New translation keys cover entity and user common kinds

The system MUST add `errors.ENTITY_NOT_FOUND`, `errors.ENTITY_NAME_ALREADY_EXISTS`, `errors.ENTITY_EMAIL_ALREADY_EXISTS`, `errors.USER_ALREADY_DELETED`, and `errors.APP_ERROR` keys in en, es, and pt, because those ErrorKind values currently resolve no key and fall back to the English `defaultMessage`.

#### Scenario: ENTITY_EMAIL_ALREADY_EXISTS translates in English

- GIVEN a `DomainError` with kind `ENTITY_EMAIL_ALREADY_EXISTS`
- AND a request with `Accept-Language: en`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Email already exists"

#### Scenario: ENTITY_NAME_ALREADY_EXISTS translates in Spanish

- GIVEN a `DomainError` with kind `ENTITY_NAME_ALREADY_EXISTS`
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "El nombre ya existe"

#### Scenario: USER_ALREADY_DELETED translates in Portuguese

- GIVEN a `DomainError` with kind `USER_ALREADY_DELETED`
- AND a request with `Accept-Language: pt`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "O usuário já foi excluído"

### Requirement: New translation keys cover email template errors

The system MUST add `errors.TEMPLATE_SLUG_ALREADY_EXISTS`, `errors.TEMPLATE_NOT_FOUND`, and `errors.TEMPLATE_FILE_NOT_FOUND` keys in en, es, and pt. The English values MUST preserve the wording of the current raw `ConflictException`/`NotFoundException`/`BadRequestException` messages in `email-template.service.ts`.

#### Scenario: TEMPLATE_SLUG_ALREADY_EXISTS translates in English

- GIVEN a `DomainError` with kind `TEMPLATE_SLUG_ALREADY_EXISTS`
- AND a request with `Accept-Language: en`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Template with this slug already exists"

#### Scenario: TEMPLATE_NOT_FOUND translates in Spanish

- GIVEN a `DomainError` with kind `TEMPLATE_NOT_FOUND`
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Plantilla no encontrada"

#### Scenario: TEMPLATE_FILE_NOT_FOUND translates in Portuguese

- GIVEN a `DomainError` with kind `TEMPLATE_FILE_NOT_FOUND`
- AND a request with `Accept-Language: pt`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Arquivo de template padrão não encontrado"

### Requirement: New translation keys cover parameters errors

The system MUST add `errors.PARAMETER_NOT_FOUND`, `errors.PARAMETER_OVERRIDDEN`, and `errors.PARAMETER_VALUE_INVALID` keys in en, es, and pt, because the parameter-admin controller currently throws raw `NotFoundException`/`ConflictException`/`UnprocessableEntityException` with English messages that the migration converts to `DomainError.fromKind`.

#### Scenario: PARAMETER_OVERRIDDEN translates in English

- GIVEN a `DomainError` with kind `PARAMETER_OVERRIDDEN`
- AND a request with `Accept-Language: en`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Parameter is overridden by environment"

#### Scenario: PARAMETER_VALUE_INVALID translates in Spanish

- GIVEN a `DomainError` with kind `PARAMETER_VALUE_INVALID`
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Valor inválido para el parámetro"

#### Scenario: PARAMETER_NOT_FOUND translates in Portuguese

- GIVEN a `DomainError` with kind `PARAMETER_NOT_FOUND`
- AND a request with `Accept-Language: pt`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Parâmetro não encontrado"

### Requirement: New translation key covers the app microservice error

The system MUST add the `errors.MICROSERVICE_UNAVAILABLE` key in en, es, and pt for the app service `messageMicroservice` leftover (`app.service.ts:44`), which currently throws a plain `Error`.

#### Scenario: MICROSERVICE_UNAVAILABLE translates in English

- GIVEN a `DomainError` with kind `MICROSERVICE_UNAVAILABLE`
- AND a request with `Accept-Language: en`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Microservice unavailable"

### Requirement: Existing auth-style keys keep resolving after migration

The system MUST retain the existing auth-style keys (`EMAIL_OR_USERNAME_EXISTS`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `ACCOUNT_INACTIVE`, `EXPIRED_RESET_TOKEN`, `EXPIRED_VERIFICATION_TOKEN`, `EXPIRED_CONFIRMATION_TOKEN`, `NO_PENDING_EMAIL_CHANGE`, `INVALID_TOKEN`, `INVALID_REFRESH_TOKEN`, `CURRENT_PASSWORD_INCORRECT`, `EMAIL_ALREADY_EXISTS`, `FORBIDDEN`) so that converting auth `HttpException` throws to `DomainError.fromKind(...)` produces the same localized messages users see today.

#### Scenario: INVALID_CREDENTIALS translates in English

- GIVEN a `DomainError` with kind `INVALID_CREDENTIALS`
- AND a request with `Accept-Language: en`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "Invalid credentials"

#### Scenario: ACCOUNT_INACTIVE translates in Spanish

- GIVEN a `DomainError` with kind `ACCOUNT_INACTIVE`
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "La cuenta de usuario está inactiva"

#### Scenario: EMAIL_ALREADY_EXISTS translates in Portuguese

- GIVEN a `DomainError` with kind `EMAIL_ALREADY_EXISTS`
- AND a request with `Accept-Language: pt`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be "O email já está registrado"

### Requirement: Missing translations fall back to defaultMessage

The system MUST NOT crash or leak the i18n key when a translation is missing. If `I18nService.translate` returns the key itself, `AllExceptionsFilter` MUST return `ErrorKind.defaultMessage` instead (implemented via `tryTranslate` in `all-exceptions.filter.ts`).

#### Scenario: Fallback for a kind without a key

- GIVEN a `DomainError` with a kind that has no `errors.{kind}` translation
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be the kind's `defaultMessage`
- AND the raw i18n key MUST NOT be returned to the client

## Testing Scenarios

### Positive Scenarios

#### ErrorKind.INTERNAL translations
- GIVEN request with Accept-Language: en AND DomainError with INTERNAL
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Internal server error"
- GIVEN request with Accept-Language: es AND DomainError with INTERNAL
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Error interno del servidor"
- GIVEN request with Accept-Language: pt AND DomainError with INTERNAL
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Erro interno do servidor"

#### ErrorKind.APP_ERROR translations
- GIVEN request with Accept-Language: en AND DomainError with APP_ERROR
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Application error"
- GIVEN request with Accept-Language: es AND DomainError with APP_ERROR
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Error de la aplicación"
- GIVEN request with Accept-Language: pt AND DomainError with APP_ERROR
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Erro do aplicativo"

#### ErrorKind.APP_VERSION_NOT_FOUND translations
- GIVEN request with Accept-Language: en AND DomainError with APP_VERSION_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "App version not found"
- GIVEN request with Accept-Language: es AND DomainError with APP_VERSION_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Versión de la app no encontrada"
- GIVEN request with Accept-Language: pt AND DomainError with APP_VERSION_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Versão do app não encontrada"

#### ErrorKind.ENTITY_NOT_FOUND translations
- GIVEN request with Accept-Language: en AND DomainError with ENTITY_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Entity not found"
- GIVEN request with Accept-Language: es AND DomainError with ENTITY_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Entidad no encontrada"
- GIVEN request with Accept-Language: pt AND DomainError with ENTITY_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Entidade não encontrada"

#### ErrorKind.ENTITY_NAME_ALREADY_EXISTS translations
- GIVEN request with Accept-Language: en AND DomainError with ENTITY_NAME_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Name already exists"
- GIVEN request with Accept-Language: es AND DomainError with ENTITY_NAME_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "El nombre ya existe"
- GIVEN request with Accept-Language: pt AND DomainError with ENTITY_NAME_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "O nome já existe"

#### ErrorKind.ENTITY_EMAIL_ALREADY_EXISTS translations
- GIVEN request with Accept-Language: en AND DomainError with ENTITY_EMAIL_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Email already exists"
- GIVEN request with Accept-Language: es AND DomainError with ENTITY_EMAIL_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "El email ya existe"
- GIVEN request with Accept-Language: pt AND DomainError with ENTITY_EMAIL_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "O email já existe"

#### ErrorKind.USER_ALREADY_DELETED translations
- GIVEN request with Accept-Language: en AND DomainError with USER_ALREADY_DELETED
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "User already deleted"
- GIVEN request with Accept-Language: es AND DomainError with USER_ALREADY_DELETED
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "El usuario ya fue eliminado"
- GIVEN request with Accept-Language: pt AND DomainError with USER_ALREADY_DELETED
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "O usuário já foi excluído"

#### ErrorKind.TEMPLATE_SLUG_ALREADY_EXISTS translations
- GIVEN request with Accept-Language: en AND DomainError with TEMPLATE_SLUG_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Template with this slug already exists"
- GIVEN request with Accept-Language: es AND DomainError with TEMPLATE_SLUG_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Ya existe una plantilla con este slug"
- GIVEN request with Accept-Language: pt AND DomainError with TEMPLATE_SLUG_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Já existe um template com este slug"

#### ErrorKind.TEMPLATE_NOT_FOUND translations
- GIVEN request with Accept-Language: en AND DomainError with TEMPLATE_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Template not found"
- GIVEN request with Accept-Language: es AND DomainError with TEMPLATE_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Plantilla no encontrada"
- GIVEN request with Accept-Language: pt AND DomainError with TEMPLATE_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Template não encontrado"

#### ErrorKind.TEMPLATE_FILE_NOT_FOUND translations
- GIVEN request with Accept-Language: en AND DomainError with TEMPLATE_FILE_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Default template file not found"
- GIVEN request with Accept-Language: es AND DomainError with TEMPLATE_FILE_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Archivo de plantilla predeterminado no encontrado"
- GIVEN request with Accept-Language: pt AND DomainError with TEMPLATE_FILE_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Arquivo de template padrão não encontrado"

#### ErrorKind.PARAMETER_NOT_FOUND translations
- GIVEN request with Accept-Language: en AND DomainError with PARAMETER_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Parameter not found"
- GIVEN request with Accept-Language: es AND DomainError with PARAMETER_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Parámetro no encontrado"
- GIVEN request with Accept-Language: pt AND DomainError with PARAMETER_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Parâmetro não encontrado"

#### ErrorKind.PARAMETER_OVERRIDDEN translations
- GIVEN request with Accept-Language: en AND DomainError with PARAMETER_OVERRIDDEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Parameter is overridden by environment"
- GIVEN request with Accept-Language: es AND DomainError with PARAMETER_OVERRIDDEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "El parámetro está sobrescrito por la variable de entorno"
- GIVEN request with Accept-Language: pt AND DomainError with PARAMETER_OVERRIDDEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "O parâmetro é sobrescrito pela variável de ambiente"

#### ErrorKind.PARAMETER_VALUE_INVALID translations
- GIVEN request with Accept-Language: en AND DomainError with PARAMETER_VALUE_INVALID
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid value for parameter"
- GIVEN request with Accept-Language: es AND DomainError with PARAMETER_VALUE_INVALID
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Valor inválido para el parámetro"
- GIVEN request with Accept-Language: pt AND DomainError with PARAMETER_VALUE_INVALID
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Valor inválido para o parâmetro"

#### ErrorKind.MICROSERVICE_UNAVAILABLE translations
- GIVEN request with Accept-Language: en AND DomainError with MICROSERVICE_UNAVAILABLE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Microservice unavailable"
- GIVEN request with Accept-Language: es AND DomainError with MICROSERVICE_UNAVAILABLE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Microservicio no disponible"
- GIVEN request with Accept-Language: pt AND DomainError with MICROSERVICE_UNAVAILABLE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Microserviço indisponível"

#### ErrorKind.EMAIL_OR_USERNAME_EXISTS translations
- GIVEN request with Accept-Language: en AND DomainError with EMAIL_OR_USERNAME_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Email or username already exists"
- GIVEN request with Accept-Language: es AND DomainError with EMAIL_OR_USERNAME_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "El email o nombre de usuario ya está registrado"
- GIVEN request with Accept-Language: pt AND DomainError with EMAIL_OR_USERNAME_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "O email ou nome de usuário já existe"

#### ErrorKind.INVALID_CREDENTIALS translations
- GIVEN request with Accept-Language: en AND DomainError with INVALID_CREDENTIALS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid credentials"
- GIVEN request with Accept-Language: es AND DomainError with INVALID_CREDENTIALS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Credenciales inválidas"
- GIVEN request with Accept-Language: pt AND DomainError with INVALID_CREDENTIALS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Credenciais inválidas"

#### ErrorKind.ACCOUNT_LOCKED translations
- GIVEN request with Accept-Language: en AND DomainError with ACCOUNT_LOCKED
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Account is temporarily locked due to too many failed login attempts. Please try again later or contact support."
- GIVEN request with Accept-Language: es AND DomainError with ACCOUNT_LOCKED
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "La cuenta está temporalmente bloqueada debido a demasiados intentos fallidos de inicio de sesión. Por favor intenta más tarde o contacta a soporte."
- GIVEN request with Accept-Language: pt AND DomainError with ACCOUNT_LOCKED
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "A conta está temporariamente bloqueada devido a muitas tentativas falhas de login. Por favor tente novamente mais tarde ou entre em contato com o suporte."

#### ErrorKind.ACCOUNT_INACTIVE translations
- GIVEN request with Accept-Language: en AND DomainError with ACCOUNT_INACTIVE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "User account is inactive"
- GIVEN request with Accept-Language: es AND DomainError with ACCOUNT_INACTIVE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "La cuenta de usuario está inactiva"
- GIVEN request with Accept-Language: pt AND DomainError with ACCOUNT_INACTIVE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "A conta de usuário está inativa"

#### ErrorKind.EXPIRED_RESET_TOKEN translations
- GIVEN request with Accept-Language: en AND DomainError with EXPIRED_RESET_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid or expired reset token"
- GIVEN request with Accept-Language: es AND DomainError with EXPIRED_RESET_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de restablecimiento inválido o expirado"
- GIVEN request with Accept-Language: pt AND DomainError with EXPIRED_RESET_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de redefinição inválido ou expirado"

#### ErrorKind.EXPIRED_VERIFICATION_TOKEN translations
- GIVEN request with Accept-Language: en AND DomainError with EXPIRED_VERIFICATION_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid or expired verification token"
- GIVEN request with Accept-Language: es AND DomainError with EXPIRED_VERIFICATION_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de verificación inválido o expirado"
- GIVEN request with Accept-Language: pt AND DomainError with EXPIRED_VERIFICATION_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de verificação inválido ou expirado"

#### ErrorKind.EXPIRED_CONFIRMATION_TOKEN translations
- GIVEN request with Accept-Language: en AND DomainError with EXPIRED_CONFIRMATION_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid or expired confirmation token"
- GIVEN request with Accept-Language: es AND DomainError with EXPIRED_CONFIRMATION_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de confirmación inválido o expirado"
- GIVEN request with Accept-Language: pt AND DomainError with EXPIRED_CONFIRMATION_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de confirmação inválido ou expirado"

#### ErrorKind.NO_PENDING_EMAIL_CHANGE translations
- GIVEN request with Accept-Language: en AND DomainError with NO_PENDING_EMAIL_CHANGE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "No pending email change found"
- GIVEN request with Accept-Language: es AND DomainError with NO_PENDING_EMAIL_CHANGE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "No hay un cambio de email pendiente"
- GIVEN request with Accept-Language: pt AND DomainError with NO_PENDING_EMAIL_CHANGE
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Nenhuma alteração de email pendente"

#### ErrorKind.INVALID_TOKEN translations
- GIVEN request with Accept-Language: en AND DomainError with INVALID_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid or expired token"
- GIVEN request with Accept-Language: es AND DomainError with INVALID_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token inválido o expirado"
- GIVEN request with Accept-Language: pt AND DomainError with INVALID_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token inválido ou expirado"

#### ErrorKind.INVALID_REFRESH_TOKEN translations
- GIVEN request with Accept-Language: en AND DomainError with INVALID_REFRESH_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Invalid refresh token"
- GIVEN request with Accept-Language: es AND DomainError with INVALID_REFRESH_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de actualización inválido"
- GIVEN request with Accept-Language: pt AND DomainError with INVALID_REFRESH_TOKEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Token de atualização inválido"

#### ErrorKind.CURRENT_PASSWORD_INCORRECT translations
- GIVEN request with Accept-Language: en AND DomainError with CURRENT_PASSWORD_INCORRECT
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Current password is incorrect"
- GIVEN request with Accept-Language: es AND DomainError with CURRENT_PASSWORD_INCORRECT
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "La contraseña actual es incorrecta"
- GIVEN request with Accept-Language: pt AND DomainError with CURRENT_PASSWORD_INCORRECT
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "A senha atual está incorreta"

#### ErrorKind.EMAIL_ALREADY_EXISTS translations
- GIVEN request with Accept-Language: en AND DomainError with EMAIL_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Email is already registered"
- GIVEN request with Accept-Language: es AND DomainError with EMAIL_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "El email ya está registrado"
- GIVEN request with Accept-Language: pt AND DomainError with EMAIL_ALREADY_EXISTS
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "O email já está registrado"

#### ErrorKind.FORBIDDEN translations
- GIVEN request with Accept-Language: en AND DomainError with FORBIDDEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Access denied"
- GIVEN request with Accept-Language: es AND DomainError with FORBIDDEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Acceso denegado"
- GIVEN request with Accept-Language: pt AND DomainError with FORBIDDEN
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Acesso negado"

#### ErrorKind.USER_NOT_FOUND translations
- GIVEN request with Accept-Language: en AND DomainError with USER_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "User not found"
- GIVEN request with Accept-Language: es AND DomainError with USER_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Usuario no encontrado"
- GIVEN request with Accept-Language: pt AND DomainError with USER_NOT_FOUND
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Usuário não encontrado"

#### ErrorKind.VALIDATION_ERROR translations
- GIVEN request with Accept-Language: en AND DomainError with VALIDATION_ERROR
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Validation error"
- GIVEN request with Accept-Language: es AND DomainError with VALIDATION_ERROR
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Error de validación"
- GIVEN request with Accept-Language: pt AND DomainError with VALIDATION_ERROR
- WHEN AllExceptionsFilter processes error
- THEN response message MUST be "Erro de validação"

### Negative Scenarios

#### Fallback when translation key is missing

- GIVEN a `DomainError` whose kind has no `errors.{kind}` key in the requested language
- AND a request with `Accept-Language: es`
- WHEN `AllExceptionsFilter` processes the error
- THEN the response message MUST be the kind's `defaultMessage`
- AND the response MUST NOT contain the literal i18n key

#### Accept-Language drives language selection

- GIVEN the same `DomainError` with kind `PARAMETER_NOT_FOUND`
- AND requests with `Accept-Language: en`, `Accept-Language: es`, and `Accept-Language: pt`
- WHEN `AllExceptionsFilter` processes each request
- THEN each response MUST use the message of the corresponding language
- AND the `es`/`pt` responses MUST NOT contain English wording

## Notes

- This capability is purely additive: no translation file entries are removed. The legacy keys `INTERNAL_ERROR`, `USER_ALREADY_EXISTS`, `TOKEN_EXPIRED`, `BAD_REQUEST`, `RATE_LIMITED`, and `INVALID_USER_ID` are retained because the `HttpException` branch of `AllExceptionsFilter` may still translate messages that match those keys.
- No files are removed by this capability. All file removals live in the `error-kind-registry` capability (`## REMOVED Files`).
- The i18n lookup is static (`errors.{kind}`, no interpolation arguments passed by the filter), so new values MUST be self-contained sentences without placeholders.
- New Spanish values use "Plantilla" / "Parámetro" terminology consistently with the domain names; English values preserve the wording of the current raw throws in `email-template.service.ts` and `parameter-admin.controller.ts`.
- The filter must keep resolving `errors.{kind}` for both the `DomainError` branch and, when the message matches a key, the `HttpException` branch.

## Acceptance Criteria

All criteria MUST pass:

1. **Full Coverage**: All 29 ErrorKind registry kinds have `errors.{kind}` keys in en, es, and pt (15 existing + 14 added in this change)
2. **Key Pattern**: Translation keys follow exactly the `errors.{ErrorKind.kind}` pattern
3. **Language Parity**: Every new kind has identical key presence across en, es, and pt JSON files (no key missing in one language)
4. **Message Parity**: The 14 new keys resolve to the expected localized values in all three languages
5. **Fallback Support**: Missing translations fall back to `ErrorKind.defaultMessage`; the i18n key is never returned to the client
6. **Language Detection**: `AllExceptionsFilter` resolves the `Accept-Language` header via `getRequestLang()` and uses it for the lookup
7. **No Invented Kinds**: No scenarios or keys reference `USER_PROFILE_NOT_FOUND`, `TOKEN_EXPIRED`, `USER_EMAIL_ALREADY_EXISTS`, or `USER_NAME_ALREADY_EXISTS` as ErrorKind values (the `TOKEN_EXPIRED` i18n key is retained only for the HttpException branch)
8. **Compatibility**: Existing auth-style keys keep their current values (no user-facing message changes for existing auth errors)

## Rollback Plan

During rollback:

1. Remove the 14 added keys from en/es/pt JSON files (42 entries total)
2. Keep the 21 pre-existing keys per language untouched
3. Keep `AllExceptionsFilter` behavior unchanged (it already falls back gracefully)
4. No legacy error class files need restoration from this capability (those are handled by the error-kind-registry rollback)

## Dependencies

- `ErrorKind` registry in `error-kind.ts` extended by the error-kind-registry capability (COU-209)
- `AllExceptionsFilter` in `all-exceptions.filter.ts` (COU-203) — already translates `errors.{kind}` for DomainError
- `I18nService.translate()` and `getRequestLang()` request-lang helper (COU-203)
- `src/common/i18n/translations/{en,es,pt}.json` — target files for the 14 new keys

## Glossary

| Term | Definition |
|------|------------|
| i18n-error-translations | Capability defining translation keys for every ErrorKind value |
| Accept-Language | HTTP header requesting language preference (es/en/pt) |
| AllExceptionsFilter | Global filter that translates domain error messages |
| DomainError.fromKind | Factory method for creating domain errors with a registered kind |
| ErrorKind.kind | Stable machine-readable identifier used as the i18n key suffix |
| Translation Key | Pattern: `errors.{ErrorKind.kind}` for i18n lookup |
| defaultMessage | Hardcoded fallback message on the ErrorKind entry when translation is missing |
| getRequestLang | Shared helper that resolves the request language from Accept-Language |
