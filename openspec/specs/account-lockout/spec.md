# account-lockout Specification

## Overview

Consecutive failed-login tracking and account lockout mechanism. After N consecutive failed login attempts, the account is locked for a configurable duration. Locked accounts return a distinct HTTP 423 error (not "invalid credentials"). Accounts auto-unlock after the lockout duration expires, and admins can manually unlock accounts. Failed attempts for non-existent users do NOT affect lockout counters.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| AL-01 | Account locks after N consecutive failures | After `LOCKOUT_MAX_ATTEMPTS` (default 5) consecutive failed login attempts for a valid user, the account MUST be locked |
| AL-02 | Failed counter resets on success | A successful login MUST reset `failedLoginAttempts` to 0 and clear `lockedUntil` |
| AL-03 | Locked account returns distinct error | A locked account MUST return HTTP 423 Locked with error code `ACCOUNT_LOCKED` — NOT the generic "invalid credentials" 401 |
| AL-04 | Account auto-unlocks after duration | After `LOCKOUT_DURATION_MINUTES` (default 15) elapses, the account MUST be automatically unlockable on the next login attempt |
| AL-05 | Lockout duration is configurable | `LOCKOUT_MAX_ATTEMPTS` and `LOCKOUT_DURATION_MINUTES` MUST be configurable via environment variables |
| AL-06 | Admin can manually unlock | PATCH /admin/users/:id/unlock on UserController guarded by admin role MUST reset `failedLoginAttempts` to 0 and clear `lockedUntil` |
| AL-07 | Non-existent user attempts do NOT lock | Failed login attempts for emails that do not match any user MUST NOT create or increment any lockout counter |
| AL-08 | Lockout status visible in profile/admin | The user's lockout state (`failedLoginAttempts`, `lockedUntil`) MUST be visible in admin user detail views |
| AL-09 | Lockout fields added to User entity | User entity MUST include `failedLoginAttempts: number` (default 0) and `lockedUntil?: Date` fields |
| AL-10 | i18n error message for lockout | 423 responses MUST include an i18n-translated error body with key `errors.ACCOUNT_LOCKED` in es/en/pt |
| AL-11 | AccountLockedException class | A new `AccountLockedException` extending `HttpException` MUST be created in `src/common/errors/` returning HTTP 423 |

## Scenarios

### AL-S01: Account locks after N consecutive failed login attempts

**Given** `LOCKOUT_MAX_ATTEMPTS` is set to 5
**And** a user exists with email `test@example.com` and correct password `Secret123!`
**And** the user currently has 0 failed login attempts
**When** 5 consecutive POST /auth/login requests are made with email `test@example.com` and wrong password `wrong`
**Then** the 5th failed attempt MUST still return HTTP 401 with "Invalid credentials"
**And** the user's `failedLoginAttempts` MUST be 5
**And** the user's `lockedUntil` MUST be set to a future timestamp (now + `LOCKOUT_DURATION_MINUTES`)
**And** the 6th login attempt MUST return HTTP 423 with error code `ACCOUNT_LOCKED`

### AL-S02: Failed counter resets on successful login

**Given** a user has `failedLoginAttempts` = 3
**And** the account is NOT locked
**When** the user sends a POST /auth/login with correct credentials
**Then** the server MUST return HTTP 200 with the auth response
**And** the user's `failedLoginAttempts` MUST be reset to 0
**And** the user's `lockedUntil` MUST be cleared (undefined)

### AL-S03: Locked account returns distinct error

**Given** a user's account is currently locked (`lockedUntil` is in the future)
**When** any login attempt is made for that user (correct or incorrect password)
**Then** the server MUST return HTTP 423 Locked
**And** the response body MUST contain error code `ACCOUNT_LOCKED`
**And** the response MUST NOT contain "Invalid credentials"
**And** the response MUST include an i18n message indicating the account is locked

### AL-S04: Account auto-unlocks after lockout duration expires

**Given** a user's account is locked with `lockedUntil` set to `2024-01-01T10:00:00Z`
**And** `LOCKOUT_DURATION_MINUTES` is 15
**And** the current time is `2024-01-01T10:16:00Z` (past the lockout)
**When** the user sends a POST /auth/login with correct credentials
**Then** the server MUST process the login normally
**And** MUST return HTTP 200 with the auth response
**And** the user's `failedLoginAttempts` MUST be reset to 0
**And** the user's `lockedUntil` MUST be cleared

### AL-S05: Lockout duration is configurable

**Given** `LOCKOUT_MAX_ATTEMPTS` is set to 3
**And** `LOCKOUT_DURATION_MINUTES` is set to 30
**When** a valid user makes 3 consecutive failed login attempts
**Then** the account MUST be locked
**And** `lockedUntil` MUST be set to approximately 30 minutes from the lock time
**And** the account MUST remain locked for the full 30 minutes

### AL-S06: Admin can manually unlock an account

**Given** a user's account is currently locked
**And** an authenticated admin user sends a request
**When** PATCH /admin/users/:id/unlock is called with the locked user's ID
**Then** the server MUST return HTTP 200
**And** the user's `failedLoginAttempts` MUST be reset to 0
**And** the user's `lockedUntil` MUST be cleared
**And** the user MUST be able to log in immediately with correct credentials

### AL-S07: Admin unlock requires admin role

**Given** a non-admin authenticated user
**When** they attempt PATCH /admin/users/:id/unlock
**Then** the server MUST return HTTP 403 Forbidden

### AL-S08: Failed attempts for non-existent users do NOT lock anything

**Given** no user exists with email `nonexistent@example.com`
**When** 100 consecutive POST /auth/login requests are made with email `nonexistent@example.com` and any password
**Then** every request MUST return HTTP 401 with "Invalid credentials"
**And** no user document MUST be created or modified
**And** no lockout counter MUST be incremented
**And** rate limiting (RL capability) MAY still apply to these requests

### AL-S09: Lockout status is visible in admin views

**Given** a user has `failedLoginAttempts` = 3 and `lockedUntil` set to a future timestamp
**When** an admin retrieves the user's profile via the admin user detail endpoint
**Then** the response MUST include `failedLoginAttempts` with value 3
**And** the response MUST include `lockedUntil` with the future timestamp
**And** a non-admin user retrieving their own profile MAY see these fields (implementation decision)

### AL-S10: Lockout check happens before credential validation

**Given** a user's account is currently locked
**When** a login attempt is made with the CORRECT password
**Then** the server MUST still return HTTP 423 (not 200)
**And** credential validation MUST NOT be performed while the account is locked

## Error Codes

| HTTP Status | Error Code | i18n Key | Description |
|-------------|-----------|----------|-------------|
| 423 | ACCOUNT_LOCKED | `errors.ACCOUNT_LOCKED` | Account is temporarily locked due to too many failed login attempts. |

### i18n Translation Keys

```json
{
  "errors": {
    "ACCOUNT_LOCKED": {
      "en": "Account is temporarily locked due to too many failed login attempts. Please try again later or contact support.",
      "es": "La cuenta está temporalmente bloqueada debido a demasiados intentos fallidos de inicio de sesión. Por favor intenta más tarde o contacta a soporte.",
      "pt": "A conta está temporariamente bloqueada devido a muitas tentativas falhas de login. Por favor tente novamente mais tarde ou entre em contato com o suporte."
    }
  }
}
```

## User Entity Changes

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `failedLoginAttempts` | `number` | `0` | Consecutive failed login counter |
| `lockedUntil` | `Date \| undefined` | `undefined` | Timestamp when lockout expires |

## Affected Endpoints

| Method | Path | Auth Required | Role | Description |
|--------|------|--------------|------|-------------|
| POST | /auth/login | No | — | Lockout check added before credential validation |
| PATCH | /admin/users/:id/unlock | Yes | Admin | Manually unlock a locked account |
| GET | /admin/users/:userId | Yes | Admin | Response includes lockout fields |

## Affected Files

| File | Change |
|------|--------|
| `src/user/entities/user.entity.ts` | Add `failedLoginAttempts` and `lockedUntil` fields |
| `src/auth/auth.service.ts` | Add lockout check, increment, reset logic in `login()` |
| `src/user/controller/user.controller.ts` | Add admin unlock endpoint (PATCH /admin/users/:id/unlock) |
| `src/user/service/user.service.ts` | Add `unlockUser()` method |
| `src/common/errors/` | New `AccountLockedException` class |
| `src/config/env.validation.ts` | Add `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES` validation |
| `src/common/i18n/translations/en.json` | Add `ACCOUNT_LOCKED` key |
| `src/common/i18n/translations/es.json` | Add `ACCOUNT_LOCKED` key |
| `src/common/i18n/translations/pt.json` | Add `ACCOUNT_LOCKED` key |
| `src/auth/api-docs/` | Add 423 response documentation to login endpoint |
