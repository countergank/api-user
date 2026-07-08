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