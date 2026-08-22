# i18n-admin Specification

## Purpose

Admin endpoint to reload i18n translation files at runtime without server restart. Requires authentication but not necessarily ADMIN role (JwtAuthGuard only).

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| I18N-A01 | Reload translations | POST /admin/i18n/reload reloads i18n files from disk |
| I18N-A02 | Auth required | Endpoint requires valid JWT (JwtAuthGuard) |

### Requirement: I18N-A01 — Reload translations

The system MUST accept POST /admin/i18n/reload to reload translation files from disk into the i18n runtime cache.

#### Scenario: Reload translations successfully

- GIVEN translation files exist on disk and have been modified
- WHEN authenticated user sends POST /admin/i18n/reload
- THEN returns HTTP 200 with success confirmation
- AND subsequent i18n lookups return updated translations

#### Scenario: Reload with missing translation files

- GIVEN translation files are missing or corrupted on disk
- WHEN authenticated user sends POST /admin/i18n/reload
- THEN returns HTTP 500 or appropriate error
- AND existing cached translations remain unchanged

### Requirement: I18N-A02 — Auth required

The endpoint MUST require a valid JWT token via JwtAuthGuard.

#### Scenario: 401 without token

- WHEN POST /admin/i18n/reload is called without Authorization header
- THEN returns HTTP 401 Unauthorized

#### Scenario: 200 with valid token (any role)

- GIVEN authenticated user with any role (USER, ADMIN, VIEWER)
- WHEN POST /admin/i18n/reload is called
- THEN returns HTTP 200 (role check passes — JwtAuthGuard only)
