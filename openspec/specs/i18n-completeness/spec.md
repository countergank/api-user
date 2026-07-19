# i18n-completeness Specification

> Migrated from `openspec/SPEC.md` (deleted 2026-07-06).

## Overview

Complete internationalization (es/en/pt) of all endpoint responses — both success messages and error codes. No hardcoded English strings remain in any controller or service.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| I18N-01 | All success messages internationalized | Every controller returning `{ message }` MUST use i18n translation keys |
| I18N-02 | All error messages use codes | Exceptions MUST use short i18n-compatible codes (INVALID_CREDENTIALS, not 'Invalid credentials') |
| I18N-03 | Validation errors internationalized | Class-validator custom messages MUST use i18n-compatible keys |
| I18N-04 | I18nModule is global | @Global() decorator enables cross-module I18nService injection |
| I18N-05 | JSON keys merged at startup | New keys added to JSON files are auto-merged into MongoDB translations on startup and reload |
| I18N-06 | Build copies i18n assets | nest-cli.json assets config copies JSON files to dist/ |

## Error Codes Internationalized

| Code | es | en | pt |
|------|----|----|-----|
| INVALID_CREDENTIALS | Credenciales inválidas | Invalid credentials | Credenciais inválidas |
| ACCOUNT_INACTIVE | La cuenta está inactiva | User account is inactive | A conta está inativa |
| EMAIL_OR_USERNAME_EXISTS | Email ou nome já registrado | Email or username already exists | Email ou nome já existe |
| INVALID_REFRESH_TOKEN | Token de actualización inválido | Invalid refresh token | Token de atualização inválido |
| NO_PENDING_EMAIL_CHANGE | No hay cambio pendiente | No pending email change found | Nenhuma alteração pendente |
| CURRENT_PASSWORD_INCORRECT | Contraseña actual incorrecta | Current password is incorrect | Senha atual incorreta |
| INVALID_USER_ID | ID de usuario inválido | Invalid user ID | ID de usuário inválido |

## Success Messages Internationalized

All `{ message }` responses use `messages.*` keys with es/en/pt translations.

## Implementation

- **I18nService**: `src/common/i18n/i18n.service.ts` — onModuleInit, mergeJsonKeys, deepMerge
- **I18nModule**: `src/common/i18n/i18n.module.ts` — @Global()
- **Translations**: `src/common/i18n/translations/{es,en,pt}.json`
- **Controllers**: AuthController, UserController, UserProfileController — @Inject(I18nService)

## Affected Endpoints

All endpoints returning responses now use translated messages based on Accept-Language header.
