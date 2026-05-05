# i18n-testing Specification

## Purpose

Ensures comprehensive testing coverage for the internationalization feature, including unit tests, integration tests, and end-to-end (e2e) tests with a minimum coverage of 80%.

## Requirements

### Requirement: Unit Tests for I18nService

The system SHALL have unit tests for the `I18nService` covering language detection and translation resolution.

#### Scenario: Unit test - translate existing key
- GIVEN `I18nService` is initialized with language `en`
- WHEN `translate('errors.USER_NOT_FOUND')` is called
- THEN the method MUST return the English translation

#### Scenario: Unit test - fallback for missing key
- GIVEN `I18nService` is initialized with language `es`
- WHEN `translate('errors.NONEXISTENT')` is called
- THEN the method MUST return the key itself as fallback

#### Scenario: Unit test - interpolation support
- GIVEN `I18nService` is initialized with language `pt`
- AND a translation exists with placeholder `{username}`
- WHEN `translate('welcome.user', { username: 'João' })` is called
- THEN the method MUST return the translated string with `João` inserted

### Requirement: Integration Tests for Error Translation

The system SHALL have integration tests verifying error messages are correctly translated.

#### Scenario: Integration test - error in English
- GIVEN the API is running
- AND a request is made with header `Accept-Language: en`
- WHEN an endpoint triggers error `APP-USER-001`
- THEN the response MUST include the English message

#### Scenario: Integration test - error in Portuguese
- GIVEN the API is running
- AND a request is made with header `Accept-Language: pt`
- WHEN an endpoint triggers error `APP-USER-001`
- THEN the response MUST include the Portuguese message

### Requirement: End-to-End Tests with Multiple Languages

The system SHALL have e2e tests using Supertest to verify complete flows in all supported languages.

#### Scenario: e2e test - user registration welcome email
- GIVEN a new user registers with `Accept-Language: en`
- WHEN the registration endpoint is called
- THEN the welcome email MUST be sent in English
- AND the response messages MUST be in English

#### Scenario: e2e test - validation errors in Portuguese
- GIVEN a request is made with `Accept-Language: pt`
- AND invalid data is sent to a DTO-validated endpoint
- WHEN validation fails
- THEN the validation error messages MUST be in Portuguese

#### Scenario: e2e test - default language (Spanish)
- GIVEN a request is made without `Accept-Language` header
- WHEN any endpoint returns an error
- THEN the error message MUST be in Spanish (default)

### Requirement: Test Coverage

The system SHALL maintain at least 80% test coverage for all i18n-related code.

#### Scenario: Coverage threshold
- GIVEN all i18n tests are executed
- WHEN coverage is calculated
- THEN the coverage for i18n modules MUST be ≥ 80%

#### Scenario: Backward compatibility tests
- GIVEN existing tests in the project
- WHEN i18n feature is implemented
- THEN all existing tests MUST still pass (no regressions)
