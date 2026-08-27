# Spec: Security

**Change**: nestjs-p0-security-health
**Linear**: COU-113
**Date**: 2026-07-03

## Purpose

Enforce P0 security constraints: CORS origin allowlist, JWT secret validation, and environment variable documentation. These requirements eliminate hardcoded secrets and open CORS policies that expose the API to token forgery and cross-origin attacks.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| SEC-01 | CORS origin allowlist | `CORS_ORIGINS` env var MUST be required; app MUST reject requests from non-allowlisted origins |
| SEC-02 | JWT secret validation | `JWT_SECRET` MUST be required in env validation; app MUST fail at startup if missing |
| SEC-03 | JWT secret via ConfigService | `auth.module.ts` and `jwt.strategy.ts` MUST use `ConfigService.getOrThrow('JWT_SECRET')` |
| SEC-04 | Env var documentation | `.env.example` MUST document `JWT_SECRET` and `CORS_ORIGINS` as required |

### Requirement: SEC-01 — CORS Origin Allowlist

The system MUST read `CORS_ORIGINS` from environment variables as a comma-separated list of allowed origins. The application MUST configure CORS to reject requests from any origin not in this list. Wildcard (`*`) values MUST be rejected at startup. An empty `CORS_ORIGINS` value MUST cause the application to fail at startup.

#### Scenario: Request from allowlisted origin
- **GIVEN** `CORS_ORIGINS=https://app.example.com,https://admin.example.com`
- **WHEN** a request arrives with `Origin: https://app.example.com`
- **THEN** the response includes `Access-Control-Allow-Origin: https://app.example.com`
- **AND** the request is processed normally

#### Scenario: Request from non-allowlisted origin
- **GIVEN** `CORS_ORIGINS=https://app.example.com`
- **WHEN** a request arrives with `Origin: https://evil.com`
- **THEN** the response does NOT include `Access-Control-Allow-Origin`
- **AND** the CORS preflight (OPTIONS) returns without allow headers

#### Scenario: Multiple comma-separated origins
- **GIVEN** `CORS_ORIGINS=https://a.com,https://b.com,https://c.com`
- **WHEN** requests arrive from each origin in sequence
- **THEN** all three origins receive correct `Access-Control-Allow-Origin` headers

#### Scenario: Wildcard in CORS_ORIGINS rejected at startup
- **GIVEN** `CORS_ORIGINS=*`
- **WHEN** the application starts
- **THEN** the application MUST throw a validation error and exit
- **AND** the error message indicates wildcard origins are not allowed

#### Scenario: Empty CORS_ORIGINS rejected at startup
- **GIVEN** `CORS_ORIGINS=` (empty string)
- **WHEN** the application starts
- **THEN** the application MUST throw a validation error and exit

### Requirement: SEC-02 — JWT Secret Validation

The system MUST include `JWT_SECRET` in `EnvironmentVariables` with `@IsNotEmpty()` validation. The application MUST fail to start if `JWT_SECRET` is not set or is empty. No hardcoded fallback values are permitted anywhere in the codebase.

#### Scenario: JWT_SECRET missing at startup
- **GIVEN** `JWT_SECRET` is not set in the environment
- **WHEN** the application starts
- **THEN** the env validation MUST throw an error
- **AND** the application process exits with a non-zero code
- **AND** the error message identifies `JWT_SECRET` as missing

#### Scenario: JWT_SECRET empty string at startup
- **GIVEN** `JWT_SECRET=` (empty string)
- **WHEN** the application starts
- **THEN** the env validation MUST throw an error (same as missing)

#### Scenario: JWT_SECRET set correctly
- **GIVEN** `JWT_SECRET=super-secret-value-123`
- **WHEN** the application starts
- **THEN** the application starts successfully
- **AND** JWT signing and verification use this secret

### Requirement: SEC-03 — JWT Secret via ConfigService

Both `auth.module.ts` and `jwt.strategy.ts` MUST inject `ConfigService` and read the JWT secret via `configService.getOrThrow('JWT_SECRET')`. Direct access to `process.env.JWT_SECRET` MUST NOT be used. No hardcoded string fallbacks are permitted.

#### Scenario: auth.module.ts uses ConfigService
- **GIVEN** the application is configured with `JwtModule.registerAsync`
- **WHEN** `auth.module.ts` initializes the JWT module
- **THEN** it injects `ConfigService` and calls `configService.getOrThrow('JWT_SECRET')`
- **AND** no `process.env` access exists in this file

#### Scenario: jwt.strategy.ts uses ConfigService
- **GIVEN** the `JwtStrategy` class is instantiated
- **WHEN** the constructor configures the Passport JWT strategy
- **THEN** it injects `ConfigService` and calls `configService.getOrThrow('JWT_SECRET')` for `secretOrKey`
- **AND** no `process.env` access exists in this file

#### Scenario: No hardcoded fallback anywhere
- **GIVEN** the codebase is searched for JWT secret configuration
- **WHEN** scanning `auth.module.ts` and `jwt.strategy.ts`
- **THEN** no string literal fallback (e.g., `'your-secret-key'`) exists
- **AND** no `|| '...'` pattern exists for JWT secret

### Requirement: SEC-04 — Environment Variable Documentation

The `.env.example` file MUST document `JWT_SECRET` and `CORS_ORIGINS` as required variables. Each MUST include a description of its purpose and expected format.

#### Scenario: JWT_SECRET documented in .env.example
- **GIVEN** the `.env.example` file exists
- **WHEN** a developer reads the Security section
- **THEN** `JWT_SECRET` is listed as a required variable
- **AND** includes a description (e.g., "Secret key for JWT token signing")
- **AND** includes a placeholder value (not a real secret)

#### Scenario: CORS_ORIGINS documented in .env.example
- **GIVEN** the `.env.example` file exists
- **WHEN** a developer reads the Security section
- **THEN** `CORS_ORIGINS` is listed as a required variable
- **AND** includes format description (e.g., "Comma-separated list of allowed origins")
- **AND** includes an example value (e.g., `https://app.example.com,https://admin.example.com`)

### Requirement: SEC-05 — CSRF Protection Waiver

This API uses JWT Bearer token authentication exclusively via the `Authorization` header (`ExtractJwt.fromAuthHeaderAsBearerToken()`). No cookies are set by the server. CORS is configured with `credentials: false`. Refresh tokens are passed in request body JSON, not in httpOnly cookies. Therefore, CSRF is not an applicable attack vector.

**Waiver**: CSRF protection is explicitly waived. If cookie-based authentication is ever introduced, CSRF protection MUST be added at that time.

#### Scenario: CSRF not needed for JWT Bearer auth
- **GIVEN** the API authenticates via `Authorization: Bearer <token>` header
- **AND** no cookies are set by the server
- **AND** CORS `credentials: false`
- **WHEN** a cross-origin request arrives without a valid Bearer token
- **THEN** the request is rejected with 401 Unauthorized
- **AND** no CSRF token validation is required

#### Scenario: CSRF waiver invalidated if cookies added
- **GIVEN** a future change introduces cookie-based authentication (session, refresh token in httpOnly cookie)
- **WHEN** the security spec is reviewed
- **THEN** CSRF protection MUST be implemented before merging that change
---

## Purpose

Define security guards, rate limiting, and audit logging for parameter admin endpoints.

## Requirements

### R1 — Auth Guards Configuration

The system MUST enforce admin-only access for all parameter admin endpoints:

#### R1.1 JwtAuthGuard
- All endpoints MUST use `JwtAuthGuard` for JWT authentication
- Validates JWT token from Authorization header
- Requires valid token for access
- Returns HTTP 401 if token invalid or missing

#### R1.2 RolesGuard with Admin Role
- All endpoints MUST use `RolesGuard` for role-based authorization
- Decorated with `@Roles(UserRole.ADMIN)`
- Requires authenticated user to have `ADMIN` role
- Returns HTTP 403 if user lacks required role

#### R1.3 Guard Composition
- Combined guard chain: `JwtAuthGuard` + `RolesGuard`
- Order: Authentication first, then authorization
- All parameter admin endpoints require both guards

### R2 — Rate Limiting Configuration

The system MUST enforce stricter rate limiting for admin endpoints:

#### R2.1 THROTTLE_ADMIN_DEFAULT
- GET /admin/parameters: 30 requests / 60 seconds
- GET /admin/parameters/:group: 30 requests / 60 seconds
- Guards: Applied at controller level

#### R2.2 THROTTLE_ADMIN_STRICT
- PUT /admin/parameters/:key: 10 requests / 60 seconds
- Guards: Applied at controller level
- Stricter limits for destructive operations

#### R2.3 Rate Limiting Headers
- MUST return rate limit headers:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Requests remaining in current window
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### R3 — Audit Logging

The system MUST create audit logs for admin parameter modifications:

#### R3.1 Audit Action Configuration
- PUT /admin/parameters/:key MUST create audit log entry
- Action: `'PARAMETER_UPDATE'`
- Resource: `'parameter'`
- Decorator: `@AuditAction()` with action and resource

#### R3.2 Audit Log Content
- User ID of admin who made the change
- Timestamp of the update
- Parameter key being updated
- Previous value (if available)
- New value
- Request details (IP, user agent)

#### R3.3 Audit Logging for Other Endpoints
- GET /admin/parameters: NO audit log entry
- GET /admin/parameters/:group: NO audit log entry
- Only destructive operation (PUT) requires audit logging

### R4 — Security Error Handling

The system MUST handle security-related errors:

#### R4.1 Authentication Failures
- Invalid/missing JWT: HTTP 401 Unauthorized
- Error message: "Unauthorized"

#### R4.2 Authorization Failures
- Insufficient permissions: HTTP 403 Forbidden
- Error message: "Access denied. Required roles: [\"ADMIN\"]. Your role: \"[userRole]\"

#### R4.3 Rate Limiting Failures
- Too many requests: HTTP 429 Too Many Requests
- Error message: "Too many requests"
- Error message: "Rate limit exceeded. Try again later."

## Scenarios

### Scenario 1: Authentication protection for all endpoints
**Given** request without valid JWT token
**And** trying to access `GET /admin/parameters`
**When** request reaches `JwtAuthGuard`
**Then** guard returns HTTP 401 Unauthorized
**And** error message: "Unauthorized"
**And** no further guard processing occurs
**And** no audit log is created

### Scenario 2: Authorization enforcement for all endpoints
**Given** valid JWT token but user has role "user" (not admin)
**And** trying to access `GET /admin/parameters`
**When** request reaches `RolesGuard(@Roles(UserRole.ADMIN))`
**Then** guard returns HTTP 403 Forbidden
**And** error message: "Access denied. Required roles: [\"ADMIN\"]. Your role: \"user\"
**And** no audit log is created

### Scenario 3: Rate limiting for GET endpoints
**Given** admin user with 29 requests to `GET /admin/parameters` within 59 minutes
**And** rate limit window: 60 seconds
**And** limit: 30 requests per window
**When** admin makes 30th request
**Then** rate limiter allows request
**And** X-RateLimit-Remaining header shows 0 or 1
**And** response returns HTTP 200 OK
**And** no audit log is created

### Scenario 4: Rate limiting for GET endpoints exceeded
**Given** admin user has made 30 requests to `GET /admin/parameters` within 60 minutes
**And** rate limit window still active
**When** admin makes 31st request
**Then** rate limiter returns HTTP 429 Too Many Requests
**And** error message: "Too many requests"
**And** X-RateLimit-Reset header shows future reset time
**And** request is not processed
**And** no audit log is created

### Scenario 5: Stricter rate limiting for PUT endpoint
**Given** admin user has made 9 requests to `PUT /admin/parameters/:key` within 59 minutes
**And** PUT rate limit window: 60 seconds
**And** PUT limit: 10 requests per window
**When** admin makes 10th PUT request
**Then** PUT rate limiter allows request
**And** PUT-specific X-RateLimit-Remaining header shows remaining
**And** response returns HTTP 200 OK
**And** audit log is created

### Scenario 6: Rate limiting for PUT endpoint exceeded
**Given** admin user has made 10 requests to `PUT /admin/parameters/:key` within 60 minutes
**And** rate limit window still active
**When** admin makes 11th PUT request
**Then** PUT rate limiter returns HTTP 429 Too Many Requests
**And** error message: "Too many requests"
**And** GET rate limits are not affected
**And** request is not processed
**And** no audit log is created

### Scenario 7: Audit logging for successful parameter update
**Given** admin user with valid JWT and ADMIN role
**And** parameter `EMAIL_PROVIDER` exists (type: string, default: "smtp")
**And** no environment override for key
**When** admin sends `PUT /admin/parameters/EMAIL_PROVIDER` with { "value": "sendgrid" }
**Then** successful update returns HTTP 200 OK
**And** audit log is created
**And** audit log contains:
- User ID of admin
- Action: 'PARAMETER_UPDATE'
- Resource: 'parameter'
- Key: 'EMAIL_PROVIDER'
- Old value: from Redis (if exists, else default)
- New value: 'sendgrid'
- Timestamp

### Scenario 8: No audit logging for GET endpoints
**Given** admin user with valid JWT and ADMIN role
**And** requesting `GET /admin/parameters`
**When** request processes successfully
**Then** response returns HTTP 200 OK
**And** no audit log is created
**And** system logs normal request access (optional)

### Scenario 9: Security headers present
**Given** admin user with valid JWT and ADMIN role
**And** accessing any admin endpoint
**When** request processes successfully
**Then** response includes security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- Rate limiting headers (as defined)

### Scenario 10: CORS configuration for admin endpoints
**Given** browser request from allowed origin
**And** admin endpoint request
**When** request reaches controller
**Then** CORS allows request (origin in allowed list)
**And** preflight request passes