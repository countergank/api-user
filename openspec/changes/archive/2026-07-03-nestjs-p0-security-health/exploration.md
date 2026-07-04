# Exploration: nestjs-p0-security-health

**Change**: nestjs-p0-security-health
**Linear**: COU-113
**Date**: 2026-07-03

## Context

Cycle 1 of the NestJS skill standardization initiative. Two workstreams:
- **WS-1**: Fix P0 security blockers — CORS open to all origins + JWT secret hardcoded fallback
- **WS-2**: Add health check endpoint (`/health` route)

## Current State Analysis

### WS-1A: CORS — Open to All Origins

**File**: `src/main.ts:30`
```typescript
app.enableCors();  // NO origin restriction — wildcard in production
```
- `FRONTEND_URL` exists in `src/config/env.validation.ts:112` but is `@IsOptional()` and **never wired to CORS**.
- `.env.example:68` documents `FRONTEND_URL=http://localhost:5173` but it's only used by the email listener for link generation.
- **Risk**: Any domain can make cross-origin requests to this API.

### WS-1B: JWT Secret Hardcoded Fallback

**Files**: `src/auth/auth.module.ts:15` and `src/auth/strategies/jwt.strategy.ts:12`
```typescript
// auth.module.ts
secret: process.env.JWT_SECRET || 'your-secret-key',

// jwt.strategy.ts
secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
```
- `JWT_SECRET` is **NOT in `env.validation.ts`** — the app starts successfully without it, silently using the hardcoded fallback.
- The secret is duplicated in **two places** — both must be consistent.
- Test setup (`test/jest.setup.ts:13`) correctly sets `JWT_SECRET = 'test-jwt-secret-key-for-testing'`.
- **Risk**: In production without `JWT_SECRET`, anyone who knows the fallback can forge valid JWTs.

### WS-2: Missing `/health` Endpoint

**File**: `Dockerfile:63`
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "require('http').get('http://localhost:3000/health', ...)"
```
- Docker HEALTHCHECK hits `/health` but **no such route exists**.
- `AppController @Get()` returns version info only (`Version` class), not health status.
- `@nestjs/terminus` is **NOT installed** (not in `package.json` dependencies).
- `AppController` JSDoc comment says "Provee endpoints de health check y versión" — misleading, health doesn't exist.

### Env Validation Pattern
- Uses `class-validator` with `plainToInstance` + `validateSync` in `src/config/env.validation.ts`.
- Well-structured with `@IsNotEmpty()` for required, `@IsOptional()` for optional.
- **Missing**: `JWT_SECRET` (required for auth), `CORS_ORIGINS` (needed for CORS config).

### MongoDB Connection
- `MongooseModuleOption` builds URI: `mongodb://${host}:${port}/${database}` — **no auth credentials** despite `DATABASE_USER`/`DATABASE_PASSWORD` being validated.
- No health ping check available.

## Files to Investigate

| File | Why |
|------|-----|
| `src/main.ts` | CORS config, Fastify setup |
| `src/auth/auth.module.ts` | JwtModule registration, JWT secret |
| `src/auth/strategies/jwt.strategy.ts` | secretOrKey |
| `src/config/env.validation.ts` | env schema, what's already validated |
| `src/config/custom-module-options/` | config module options |
| `src/app/app.module.ts` | module structure, what's registered |
| `src/app/controller/app.controller.ts` | current root route |
| `package.json` | check if @nestjs/terminus is already a dependency |
| `Dockerfile` | HEALTHCHECK line |
| `docker-compose.yml` | Mongo URI, env vars |
| `.env.example` | what env vars are documented |
| `src/common/constrants.ts` | constants that might be relevant |
| `test/jest.setup.ts` | test env defaults |

## Risks Identified

1. **Breaking change for CORS**: If `CORS_ORIGINS` is required, existing deployments without this env var will fail at startup.
2. **JWT secret rotation**: If production is currently running with the hardcoded fallback, changing to require `JWT_SECRET` will invalidate all existing tokens.
3. **MongoDB auth gap**: `DATABASE_USER`/`DATABASE_PASSWORD` are validated but not used in the connection URI.
4. **Test coverage**: Adding `/health` requires e2e test updates.

## Recommended Approach

**WS-1 (Security)**:
1. Add `JWT_SECRET` (`@IsNotEmpty()`) and `CORS_ORIGINS` (`@IsNotEmpty()`) to `env.validation.ts`
2. Switch `JwtModule.register()` → `JwtModule.registerAsync()` with `ConfigService`
3. Inject `ConfigService` in `jwt.strategy.ts`, use `configService.getOrThrow('JWT_SECRET')`
4. In `main.ts`, parse `CORS_ORIGINS`, split by comma, pass to `app.enableCors({ origin: originsArray })`

**WS-2 (Health Check)**:
1. Install `@nestjs/terminus`
2. Register `TerminusModule` in `AppModule`
3. Add `@Get('health')` with `@HealthCheck()` to `AppController`
4. Inject `HealthCheckService`, `MongooseHealthIndicator`