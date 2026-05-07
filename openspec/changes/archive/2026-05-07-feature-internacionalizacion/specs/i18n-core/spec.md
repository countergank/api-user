# i18n-core Specification

## Purpose

Core internationalization service providing language detection and translation resolution for the API-User system. Supports Spanish (es), English (en), and Portuguese (pt).

## Requirements

### Requirement: Language Detection

The system SHALL detect the requested language from the `Accept-Language` HTTP header.

#### Scenario: Valid language header present
- GIVEN a request with header `Accept-Language: en`
- WHEN the request is processed
- THEN the system MUST set the active language to `en`

#### Scenario: Portuguese language requested
- GIVEN a request with header `Accept-Language: pt`
- WHEN the request is processed
- THEN the system MUST set the active language to `pt`

#### Scenario: No language header
- GIVEN a request without `Accept-Language` header
- WHEN the request is processed
- THEN the system MUST use `es` (Spanish) as the default language

#### Scenario: Unsupported language requested
- GIVEN a request with header `Accept-Language: fr` (unsupported)
- WHEN the request is processed
- THEN the system MUST fall back to `es` (Spanish) as the default

#### Scenario: Multiple languages in header
- GIVEN a request with header `Accept-Language: pt,en;q=0.9,fr;q=0.8`
- WHEN the request is processed
- THEN the system MUST use the first supported language (`pt`)

### Requirement: I18nService Interface

The system SHALL provide an `I18nService` with methods to resolve translations by key.

#### Scenario: Translate existing key
- GIVEN the active language is `en`
- AND a translation key `errors.USER_NOT_FOUND` exists with English translation
- WHEN `I18nService.translate('errors.USER_NOT_FOUND')` is called
- THEN the system MUST return the English translation

#### Scenario: Missing translation key
- GIVEN the active language is `en`
- AND translation key `errors.NONEXISTENT` does not exist
- WHEN `I18nService.translate('errors.NONEXISTENT')` is called
- THEN the system MUST return the key itself as fallback

#### Scenario: Translation with interpolation
- GIVEN the active language is `es`
- AND translation key `welcome.user` has value `Bienvenido, {username}`
- WHEN `I18nService.translate('welcome.user', { username: 'Juan' })` is called
- THEN the system MUST return `Bienvenido, Juan`
