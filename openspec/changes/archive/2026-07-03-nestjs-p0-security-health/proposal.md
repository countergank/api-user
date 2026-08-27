# Proposal: P0 Security + Health Check Endpoint

**Change**: nestjs-p0-security-health
**Linear**: COU-113
**Date**: 2026-07-03

## Intent

Two P0 blockers in Cycle 1: (1) CORS open to all origins and JWT secret with hardcoded fallback expose the API to token forgery and cross-origin attacks in production. (2) Docker HEALTHCHECK hits `/health` which doesn't exist, so containers never report healthy and can't be properly orchestrated.

## Scope

### In Scope
- **WS-1a**: Add `JWT_SECRET` as required env var (`@IsNotEmpty`) in `env.validation.ts`; remove hardcoded fallback from `auth.module.ts` and `jwt.strategy.ts`; wire via `ConfigService`
- **WS-1b**: Add `CORS_ORIGINS` as required env var; replace `app.enableCors()` with configured origins in `main.ts`
- **WS-1c**: Wire `DATABASE_USER`/`DATABASE_PASSWORD` into Mongoose connection URI in `mongoose-module-option.ts`
- **WS-2**: Install `@nestjs/terminus`; add `GET /health` endpoint in `AppController` with Mongoose ping check

### Out of Scope
- MongoDB authentication mechanism changes (separate ticket)
- CSRF protection (Cycle 5)
- Rate limiting improvements (already implemented, not P0)
- OpenAPI/Swagger changes
- Email service changes

## Capabilities

### New Capabilities
- `health-check`: `/health` endpoint with Mongoose connectivity verification via `@nestjs/terminus`

### Modified Capabilities
- None (security fixes are implementation-level, not spec-level behavior changes; env validation tightening is a config constraint, not a capability change)

## Approach

**WS-1 (Security)**:
1. Add `JWT_SECRET` and `CORS_ORIGINS` (comma-separated string) to `EnvironmentVariables` with `@IsNotEmpty`
2. In `auth.module.ts`: use `JwtModule.registerAsync` with `ConfigService` injection instead of static `register`
3. In `jwt.strategy.ts`: inject `ConfigService` and read `JWT_SECRET` via `configService.getOrThrow('JWT_SECRET')`
4. In `main.ts`: parse `CORS_ORIGINS` and pass to `app.enableCors({ origin: [...] })`
5. In `mongoose-module-option.ts`: build URI as `mongodb://${user}:${password}@${host}:${port}/${database}`

**WS-2 (Health Check)**:
1. `npm install @nestjs/terminus`
2. Add `TerminusModule` to `AppModule` imports
3. Add `@Get('health')` to `AppController` returning `HealthCheckResult` with `MongooseHealthIndicator.ping('database')`

**Rationale**: `registerAsync` pattern is the NestJS-standard way to inject config into dynamic modules. Using `getOrThrow` ensures the app crashes at startup if `JWT_SECRET` is missing — fail-fast is correct for P0 security.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/config/env.validation.ts` | Modified | Add `JWT_SECRET`, `CORS_ORIGINS` as required |
| `src/auth/auth.module.ts` | Modified | Switch to `JwtModule.registerAsync` with ConfigService |
| `src/auth/strategies/jwt.strategy.ts` | Modified | Inject ConfigService, remove hardcoded secret |
| `src/main.ts` | Modified | Configure CORS with `CORS_ORIGINS` env var |
| `src/config/custom-module-options/mongoose-module-option.ts` | Modified | Include auth credentials in MongoDB URI |
| `src/app/app.module.ts` | Modified | Add `TerminusModule` import |
| `src/app/controller/app.controller.ts` | Modified | Add `GET /health` endpoint |
| `src/app/controller/app.controller.spec.ts` | Modified | Add health endpoint unit test |
| `package.json` | Modified | Add `@nestjs/terminus` dependency |
| `test/jest.setup.ts` | Modified | Add `CORS_ORIGINS` default for tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing `JWT_SECRET` in existing deployments breaks startup | High | Intentional — fail-fast is correct for P0; ops must set the var |
| `CORS_ORIGINS` not set breaks frontend connectivity | Medium | Document required env vars; default to `FRONTEND_URL` if set |
| `@nestjs/terminus` compatibility with NestJS 10 | Low | v10 supports terminus v10; verify during install |
| MongoDB URI with auth breaks local dev (no credentials) | Medium | Local `.env` must include `DATABASE_USER`/`DATABASE_PASSWORD` (already validated as required) |

## Rollback Plan

1. Revert the git commit(s) for this change
2. If `JWT_SECRET` env var was added to deployment config, keep it (harmless if app falls back to old behavior)
3. If `CORS_ORIGINS` was set, revert to previous CORS config or remove to restore wildcard
4. No database migration involved — pure code/config change, safe to revert

## Dependencies

- None (Cycle 1 is first in sequence)
- Requires `@nestjs/terminus` installation (new dependency)

## Acceptance Criteria

### WS-1: Security
- [ ] App fails to start if `JWT_SECRET` is not set (throws validation error)
- [ ] No hardcoded secret strings remain in `auth.module.ts` or `jwt.strategy.ts`
- [ ] CORS rejects requests from origins not in `CORS_ORIGINS`
- [ ] MongoDB connection uses `DATABASE_USER` and `DATABASE_PASSWORD` in URI
- [ ] All existing tests pass with `JWT_SECRET` and `CORS_ORIGINS` set in test setup

### WS-2: Health Check
- [ ] `GET /health` returns 200 with `{"status":"ok","info":{"database":{"status":"up"}}}` when MongoDB is connected
- [ ] `GET /health` returns 503 when MongoDB is unreachable
- [ ] Docker HEALTHCHECK passes (container reports healthy)
- [ ] Unit test covers health endpoint

## SDD Task Breakdown Forecast

- **Estimated tasks**: 6-8 tasks
- **Estimated changed lines**: ~120-180 lines (well within 400-line review budget)
- **PR strategy**: Single PR — small enough for one review pass
- **Branch name**: `fix/p0-security-health`