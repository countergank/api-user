# rate-limiting Specification

## Overview

Request throttling for public auth endpoints using `@nestjs/throttler` with in-memory storage. Protects login, register, forgot-password, and other auth endpoints against abuse. Limits are configurable via environment variables, with stricter thresholds on login and forgot-password than on register and verification endpoints.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| RL-01 | Login endpoint rate-limited | POST /auth/login MUST return 429 Too Many Requests when the per-IP limit is exceeded within the configured TTL window |
| RL-02 | Register endpoint rate-limited | POST /auth/register MUST return 429 when the per-IP limit is exceeded within the configured TTL window |
| RL-03 | Forgot-password endpoint rate-limited | POST /auth/forgot-password MUST return 429 when the per-IP limit is exceeded within the configured TTL window |
| RL-04 | Configurable via environment variables | All throttle limits and TTLs MUST be configurable via env vars: `THROTTLE_TTL`, `THROTTLE_LIMIT`, `LOGIN_THROTTLE_TTL`, `LOGIN_THROTTLE_LIMIT`, `REGISTER_THROTTLE_TTL`, `REGISTER_THROTTLE_LIMIT`, `FORGOT_PASSWORD_THROTTLE_TTL`, `FORGOT_PASSWORD_THROTTLE_LIMIT` |
| RL-05 | Retry-After header on 429 | Every 429 response MUST include a `Retry-After` header indicating seconds until the window resets |
| RL-06 | Stricter limits on login | Login and forgot-password endpoints MUST have lower limits and/or shorter TTLs than register and verification endpoints (defaults: login 5 req/60s, register 10 req/60s) |
| RL-07 | Valid requests within limit pass | Requests within the configured limit MUST be processed normally and return their expected status codes (200, 201, 400, 401, etc.) |
| RL-08 | Throttler applied to all auth endpoints | All public auth endpoints (login, register, forgot-password, reset-password, verify-email, confirm-email-change, resend-verification, refresh) MUST have `@Throttle()` decorators applied |
| RL-09 | ThrottlerModule registered in AppModule | `ThrottlerModule.forRoot()` MUST be registered in `AppModule` with default TTL and limit values |
| RL-10 | i18n error message for rate limit | 429 responses MUST include an i18n-translated error body with key `errors.RATE_LIMITED` in es/en/pt |

## Scenarios

### RL-S01: Login endpoint is rate-limited

**Given** the login throttle limit is set to 5 requests per 60 seconds
**And** a client at IP `192.168.1.100` has already made 5 successful or failed login requests within the last 60 seconds
**When** the client sends a 6th POST /auth/login request
**Then** the server MUST respond with HTTP 429 Too Many Requests
**And** the response body MUST contain an i18n error message for rate limiting
**And** the response MUST include a `Retry-After` header with a positive integer value

### RL-S02: Register endpoint is rate-limited

**Given** the register throttle limit is set to 10 requests per 60 seconds
**And** a client at IP `10.0.0.50` has already made 10 POST /auth/register requests within the last 60 seconds
**When** the client sends an 11th POST /auth/register request
**Then** the server MUST respond with HTTP 429 Too Many Requests
**And** the response MUST include a `Retry-After` header

### RL-S03: Forgot-password endpoint is rate-limited

**Given** the forgot-password throttle limit is set to 3 requests per 60 seconds
**And** a client at IP `172.16.0.1` has already made 3 POST /auth/forgot-password requests within the last 60 seconds
**When** the client sends a 4th POST /auth/forgot-password request
**Then** the server MUST respond with HTTP 429 Too Many Requests
**And** the response MUST include a `Retry-After` header

### RL-S04: Rate limit is configurable via environment variables

**Given** the environment variable `LOGIN_THROTTLE_LIMIT` is set to `3`
**And** `LOGIN_THROTTLE_TTL` is set to `120`
**When** the application starts
**Then** the login endpoint MUST allow a maximum of 3 requests per 120-second window
**And** the 4th request within that window MUST return 429

### RL-S05: Rate-limited responses include Retry-After header

**Given** a client has exceeded the rate limit on any auth endpoint
**When** the server returns a 429 response
**Then** the `Retry-After` header MUST be present
**And** its value MUST be a positive integer representing seconds until the client can retry
**And** the value MUST be less than or equal to the configured TTL for that endpoint

### RL-S06: Different endpoints have different limit windows

**Given** the following default configuration:
  - Login: 5 requests / 60 seconds
  - Forgot-password: 3 requests / 60 seconds
  - Register: 10 requests / 60 seconds
**When** a client sends requests to each endpoint at their respective limits
**Then** login MUST block on the 6th request within 60s
**And** forgot-password MUST block on the 4th request within 60s
**And** register MUST still accept the 6th request within 60s (limit is 10)

### RL-S07: Rate limiting does NOT block valid requests within the limit

**Given** the login throttle limit is 5 requests per 60 seconds
**And** a client has made 4 requests in the current window
**When** the client sends a 5th POST /auth/login request with valid credentials
**Then** the server MUST process the request normally
**And** MUST return HTTP 200 with the auth response (user, accessToken, refreshToken)
**And** MUST NOT return 429

### RL-S08: Throttle counters reset after TTL expires

**Given** a client has exhausted the login rate limit (5 requests in 60s)
**And** the client waits for the full 60-second TTL to expire
**When** the client sends a new POST /auth/login request
**Then** the server MUST process the request normally
**And** MUST NOT return 429
**And** the throttle counter for that IP MUST have been reset

## Error Codes

| HTTP Status | Error Code | i18n Key | Description |
|-------------|-----------|----------|-------------|
| 429 | RATE_LIMITED | `errors.RATE_LIMITED` | Too many requests. Retry after the specified duration. |

### i18n Translation Keys

```json
{
  "errors": {
    "RATE_LIMITED": {
      "en": "Too many requests. Please try again in {{retryAfter}} seconds.",
      "es": "Demasiadas solicitudes. Por favor intenta de nuevo en {{retryAfter}} segundos.",
      "pt": "Muitas solicitações. Por favor tente novamente em {{retryAfter}} segundos."
    }
  }
}
```

## Affected Endpoints

| Method | Path | Throttle Default | Notes |
|--------|------|-----------------|-------|
| POST | /auth/login | 5 req / 60s | Stricter limit — brute-force vector |
| POST | /auth/forgot-password | 3 req / 60s | Stricter limit — email enumeration vector |
| POST | /auth/register | 10 req / 60s | Moderate limit |
| POST | /auth/reset-password | 10 req / 60s | Moderate limit |
| POST | /auth/verify-email | 10 req / 60s | Moderate limit |
| POST | /auth/confirm-email-change | 10 req / 60s | Moderate limit |
| POST | /auth/resend-verification | 10 req / 60s | Moderate limit |
| POST | /auth/refresh | 10 req / 60s | Moderate limit |

## Affected Files

| File | Change |
|------|--------|
| `package.json` | Add `@nestjs/throttler` dependency |
| `src/app/app.module.ts` | Import and configure `ThrottlerModule` |
| `src/auth/auth.controller.ts` | Add `@Throttle()` decorators to each endpoint |
| `src/config/env.validation.ts` | Add throttle-related env var validation |
| `src/common/i18n/translations/en.json` | Add `RATE_LIMITED` key |
| `src/common/i18n/translations/es.json` | Add `RATE_LIMITED` key |
| `src/common/i18n/translations/pt.json` | Add `RATE_LIMITED` key |
| `src/auth/api-docs/` | Add 429 response documentation to all auth endpoints |
