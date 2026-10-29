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
- **Every collection endpoint now returns the same envelope** `{ data, total, page, limit, totalPages }`
  (COU-260): `GET /admin/users`, `GET /roles`, `GET /permissions`, `GET /admin/parameters`,
  `GET /admin/parameters/:group` and `GET /email/templates`.
  - `GET /roles` and `GET /permissions` used to answer `{ "roles": [...] }` and
    `{ "permissions": [...] }`; the collection key is now `data`.
  - `GET /admin/parameters`, `GET /admin/parameters/:group` and `GET /email/templates` used to answer
    a bare JSON array.
  - `GET /email/templates?active=` is now validated as a boolean: `true` returns the active templates,
    while omitting it — or sending `false` — returns every template, exactly as before COU-260. A
    non-boolean value answers `400` (it used to be silently ignored).
  - `page` and `limit` must be integers: a fractional value such as `page=1.5` now answers `400`
    instead of slicing at a fractional offset.
  - All six accept `page` (1-indexed, default 1) and `limit` (1-100, default 20).
    `total` and `totalPages` describe the whole (or filtered) set, so a client that used to receive
    every item must now read `total`/`totalPages` (or send `limit=100`) to page through it — for
    example `GET /permissions` answers the first 20 of the catalog by default.
  - Because those four endpoints now validate a query DTO and the global pipe runs
    `forbidNonWhitelisted`, an unknown query parameter answers `400` instead of being ignored.
  - The unreachable "plain array" branch of `GET /admin/users` was deleted: the `ValidationPipe`
    already defaulted `page` to 1, so that endpoint always answered the envelope.

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

- **Migration (COU-260)**: read every collection from the `data` field of the response. Clients that
  used `response.roles` or `response.permissions` must switch to `response.data`; clients that read
  `GET /admin/parameters` or `GET /email/templates` as a root array must read `response.data` and can
  use `total` / `page` / `limit` / `totalPages`. `GET /admin/users` already answered an envelope, so
  only the removal of the impossible array branch affects its consumers (none over HTTP).
  Single-resource endpoints (`GET /admin/users/:id`, `GET /roles/:id` style responses,
  `GET /email/templates/:slug`) are unchanged.

- No database migration required — new User fields are optional with safe defaults
- Existing users automatically get `failedLoginAttempts: 0` and no `lockedUntil`
- **Migration (COU-262)**: clients that branch on the success status code must accept `200` for
  `POST /auth/reset-password`, `/auth/verify-email`, `/auth/confirm-email-change` and
  `/auth/resend-verification`; a check written as `status === 201` for those four will now see
  `200`. `POST /auth/register` is unaffected and still returns `201`. No route, payload or body
  shape changes in any of the five endpoints.
