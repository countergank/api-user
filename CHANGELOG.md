# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Rate Limiting** — All public auth endpoints are now protected by configurable rate limiting using `@nestjs/throttler`:
  - `POST /auth/login` — 5 requests per 60s (configurable via `LOGIN_THROTTLE_LIMIT` / `LOGIN_THROTTLE_TTL`)
  - `POST /auth/forgot-password` — 3 requests per 60s (configurable via `FORGOT_PASSWORD_THROTTLE_LIMIT` / `FORGOT_PASSWORD_THROTTLE_TTL`)
  - `POST /auth/register` — 10 requests per 60s (configurable via `THROTTLE_LIMIT` / `THROTTLE_TTL`)
  - `POST /auth/reset-password`, `/auth/verify-email`, `/auth/confirm-email-change`, `/auth/resend-verification`, `/auth/refresh` — 10 requests per 60s
  - Rate-limited responses return **429 Too Many Requests** with a `Retry-After` header
- **Account Lockout** — Accounts are temporarily locked after consecutive failed login attempts:
  - Default threshold: 5 failed attempts (configurable via `MAX_LOGIN_ATTEMPTS`)
  - Default lockout duration: 15 minutes (configurable via `LOCKOUT_DURATION_MINUTES`)
  - Locked accounts receive **423 Locked** with `errors.ACCOUNT_LOCKED` message
  - Accounts auto-unlock after the lockout duration expires
  - Successful login resets the failed attempt counter
  - Admin unlock endpoint: `PATCH /admin/users/:id/unlock` (requires admin role)
- **New Environment Variables**:
  - `THROTTLE_TTL`, `THROTTLE_LIMIT` — default rate limiting
  - `LOGIN_THROTTLE_TTL`, `LOGIN_THROTTLE_LIMIT` — login-specific rate limiting
  - `FORGOT_PASSWORD_THROTTLE_TTL`, `FORGOT_PASSWORD_THROTTLE_LIMIT` — forgot-password-specific rate limiting
  - `MAX_LOGIN_ATTEMPTS` — failed attempts before lockout
  - `LOCKOUT_DURATION_MINUTES` — lockout duration in minutes
- **i18n Translations** for rate limiting (`errors.RATE_LIMITED`) and account lockout (`errors.ACCOUNT_LOCKED`) in English, Spanish, and Portuguese

### Changed

- `AuthService.login()` now checks account lockout state before password validation (security optimization)
- User entity includes new fields: `failedLoginAttempts` (number, default 0) and `lockedUntil` (Date, optional)
- **Auth action endpoints now answer `200 OK` instead of `201 Created`** (COU-262). These four
  endpoints declare `@HttpCode(200)` because they perform an action and create no resource:
  - `POST /auth/reset-password`
  - `POST /auth/verify-email`
  - `POST /auth/confirm-email-change`
  - `POST /auth/resend-verification`

  `POST /auth/register` keeps answering `201 Created` — it does create a user. Swagger already
  documented `200` for the four endpoints, so the implementation now matches the published contract.

### Security

- Brute-force protection on all public auth endpoints via configurable rate limiting
- Account lockout mechanism prevents credential stuffing attacks
- Admin unlock endpoint requires both authentication and admin role (403 for non-admin)

### API Response Changes

| Status Code | Condition |
|-------------|-----------|
| 429 | Rate limit exceeded — includes `Retry-After` header |
| 423 | Account locked — message: `errors.ACCOUNT_LOCKED` (i18n translatable) |

### Backward Compatibility

- No database migration required — new User fields are optional with safe defaults
- Existing users automatically get `failedLoginAttempts: 0` and no `lockedUntil`
- **Migration (COU-262)**: clients that branch on the success status code must accept `200` for
  `POST /auth/reset-password`, `/auth/verify-email`, `/auth/confirm-email-change` and
  `/auth/resend-verification`; a check written as `status === 201` for those four will now see
  `200`. `POST /auth/register` is unaffected and still returns `201`. No route, payload or body
  shape changes in any of the five endpoints.
