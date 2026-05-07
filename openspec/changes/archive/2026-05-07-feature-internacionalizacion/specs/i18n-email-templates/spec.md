# i18n-email-templates Specification

## Purpose

Provides multilingual email templates (es/en/pt) for the API-User system, selecting the appropriate template and subject based on the active language.

## Requirements

### Requirement: Language-Specific Email Templates

The system SHALL render email templates in the active language.

#### Scenario: Welcome email in English
- GIVEN the active language is `en`
- AND a user registration triggers a welcome email
- WHEN the email template is rendered
- THEN the system MUST use the English template (`welcome.en.hbs` or equivalent)
- AND the subject MUST be in English

#### Scenario: Welcome email in Portuguese
- GIVEN the active language is `pt`
- AND a user registration triggers a welcome email
- WHEN the email template is rendered
- THEN the system MUST use the Portuguese template (`welcome.pt.hbs` or equivalent)
- AND the subject MUST be in Portuguese (`Bem-vindo!`)

#### Scenario: Welcome email in Spanish (default)
- GIVEN the active language is `es` (or not specified)
- AND a user registration triggers a welcome email
- WHEN the email template is rendered
- THEN the system MUST use the Spanish template (`welcome.es.hbs` or equivalent)
- AND the subject MUST be in Spanish (`¡Bienvenido!`)

### Requirement: Email Subject Translation

The system SHALL translate email subjects based on the active language.

#### Scenario: Password reset subject in English
- GIVEN the active language is `en`
- AND a password reset is requested
- WHEN the email is sent
- THEN the subject MUST be `Password Reset` (English)

#### Scenario: Password reset subject in Portuguese
- GIVEN the active language is `pt`
- AND a password reset is requested
- WHEN the email is sent
- THEN the subject MUST be `Redefinição de Senha` (Portuguese)

### Requirement: Template File Structure

The system SHALL organize email templates by language.

#### Scenario: Template directory structure
- GIVEN the email templates directory
- WHEN the internationalization is implemented
- THEN the system MUST have templates organized as:
  - `templates/en/` for English templates
  - `templates/es/` for Spanish templates
  - `templates/pt/` for Portuguese templates
