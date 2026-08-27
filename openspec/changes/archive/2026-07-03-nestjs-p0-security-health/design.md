# Design: nestjs-p0-security-health

**Change**: nestjs-p0-security-health
**Linear**: COU-113
**Date**: 2026-07-03

## Architecture Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | CORS config mechanism | `app.enableCors()` with array | Uses existing NestJS CORS wrapper; no need for separate Fastify CORS plugin |
| 2 | JWT module registration | `JwtModule.registerAsync()` with ConfigService | Standard NestJS pattern for injecting config into dynamic modules; replaces `process.env` direct access |
| 3 | JWT secret resolution | `ConfigService.getOrThrow('JWT_SECRET')` | Fails at startup if missing — correct fail-fast behavior for P0 security |
| 4 | Health check module placement | TerminusModule + AppController | Single endpoint doesn't justify a separate HealthModule; keeps it co-located with app-level concerns |
| 5 | CORS_ORIGINS format | Comma-separated single env var | Supports multiple frontends (mobile, admin, web) with one var; simpler than multiple env vars |
| 6 | CORS credentials | `credentials: false` | Auth uses JWT Bearer only (no cookies); no need for credential sharing |
| 7 | ConfigService in JwtStrategy | Constructor injection | Follows existing DI pattern in the project; validated secret from ConfigModule |
| 8 | MongoDB URI auth | Include `DATABASE_USER`/`DATABASE_PASSWORD` in URI | Already validated in env schema; was a gap that they weren't used in the connection string |

## Component Changes

### env.validation.ts
- Add `@IsString() @IsNotEmpty() JWT_SECRET: string`
- Add `@IsString() @IsNotEmpty() CORS_ORIGINS: string`
- Both required — app fails at startup if missing

### auth.module.ts
- Switch `JwtModule.register({ secret: process.env.JWT_SECRET || 'your-secret-key' })` → `JwtModule.registerAsync({ inject: [ConfigService], useFactory: (config) => ({ secret: config.getOrThrow('JWT_SECRET') }) })`
- No direct `process.env` access

### jwt.strategy.ts
- Inject `ConfigService` via constructor
- `secretOrKey: configService.getOrThrow('JWT_SECRET')`
- No `process.env.JWT_SECRET` access

### main.ts
- `const configService = app.get(ConfigService)`
- `const origins = configService.getOrThrow('CORS_ORIGINS').split(',').map(o => o.trim()).filter(Boolean)`
- `app.enableCors({ origin: origins, credentials: false })`

### mongoose-module-option.ts
- Build URI: `mongodb://${user}:${password}@${host}:${port}/${database}` (include auth credentials)

### app.module.ts
- Import `TerminusModule`

### app.controller.ts
- Add `@Get('health')` with `@HealthCheck()` decorator
- Inject `HealthCheckService`, `MongooseHealthIndicator`
- Return `healthCheckService.check([() => mongooseHealth.pingCheck('database')])`

## Data Flow

### CORS Request Handling
```
Request → Fastify → Origin header → CORS middleware → origin in CORS_ORIGINS array?
  YES → add Access-Control-Allow-Origin header → process request
  NO → no CORS header → browser blocks cross-origin access
```

### JWT Secret Resolution
```
Startup → ConfigModule.validate() → validateSync(env.validation.ts)
  JWT_SECRET missing → throw validation error → app exits
  JWT_SECRET present → ConfigService stores it
  → AuthModule.registerAsync → ConfigService.getOrThrow('JWT_SECRET')
  → JwtStrategy constructor → ConfigService.getOrThrow('JWT_SECRET')
  → Passport uses secret for token verification
```

### Health Check Request Flow
```
GET /health → AppController → @HealthCheck()
  → HealthCheckService.check([() => mongooseHealth.pingCheck('database')])
    → MongoDB ping succeeds → 200 { status: "ok", info: { database: { status: "up" } } }
    → MongoDB ping fails → 503 { status: "error", error: { database: { status: "down" } } }
```

## Dependency Changes

| Package | Action | Version |
|---------|--------|---------|
| `@nestjs/terminus` | Added (new dependency) | latest compatible with NestJS 10 |

## Environment Changes

| Env Var | Action | Required | Description |
|---------|--------|----------|-------------|
| `JWT_SECRET` | Added | Yes | Secret key for JWT token signing — no default, app fails to start if missing |
| `CORS_ORIGINS` | Added | Yes | Comma-separated list of allowed origins — no wildcard `*` |

## Test Strategy

### Unit Tests
1. `env.validation.spec.ts` — JWT_SECRET missing/empty/valid, CORS_ORIGINS missing/empty/valid (6 tests)
2. `auth.module.spec.ts` — JwtModule.registerAsync with ConfigService injection (1 test)
3. `jwt.strategy.spec.ts` — ConfigService.getOrThrow('JWT_SECRET'), no hardcoded fallback (2 tests)
4. `mongoose-module-option.spec.ts` — URI includes DATABASE_USER:DATABASE_PASSWORD (2 tests)
5. `app.controller.spec.ts` — Health endpoint returns status with database ping (1 test)

### E2E Tests
1. `GET /health` returns 200 when MongoDB connected

## Migration Notes

- **Breaking**: Deployments without `JWT_SECRET` will fail to start after this change. Must set env var before deploying.
- **Breaking**: Deployments without `CORS_ORIGINS` will fail to start. Must set env var before deploying.
- **JWT token invalidation**: If production was using the hardcoded `'your-secret-key'` fallback, all existing JWTs will be invalidated once a real `JWT_SECRET` is set. Users will need to re-login.
- **Docker**: HEALTHCHECK already targets `/health` — no Dockerfile change needed.