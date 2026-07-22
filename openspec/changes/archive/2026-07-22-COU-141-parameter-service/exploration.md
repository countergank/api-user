# Exploration: COU-141 — ParameterService

## Current State

The `api-user` NestJS project has **two competing patterns** for accessing environment configuration:

### Pattern 1: `ConfigService` (DI-injected, NestJS-idiomatic)
Used in ~12 files via constructor injection from `@nestjs/config`. This is the proper pattern — it supports caching, validation, and testability.

**Files using ConfigService correctly:**
- `src/main.ts` — CORS_ORIGINS, PORT, HOST, npm metadata
- `src/auth/auth.service.ts` — MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MINUTES
- `src/auth/strategies/jwt.strategy.ts` — JWT_SECRET
- `src/auth/auth.module.ts` — JWT_SECRET (via JwtModule.registerAsync)
- `src/config/redis/redis.service.ts` — REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
- `src/config/custom-providers/microservice-provider.ts` — dynamic `*_MICROSERVICE_*` keys
- `src/config/custom-module-options/mongoose-module-option.ts` — DATABASE_* keys
- `src/app/app.module.ts` — THROTTLE_TTL, THROTTLE_LIMIT
- `src/common/audit/audit.listener.ts` — AUDIT_ENABLED
- `src/common/audit/audit.interceptor.ts` and `audit-aspect.interceptor.ts`
- `src/app/service/app.service.ts`

### Pattern 2: Direct `process.env` access (bypasses DI)
**44 direct `process.env` usages** across 11 non-test source files. These bypass `ConfigService` entirely, losing caching, type safety, and testability.

**File breakdown (non-test only):**

| File | Count | Vars accessed |
|------|-------|---------------|
| `src/auth/auth.controller.ts` | 16 | THROTTLE_LIMIT/TTL, LOGIN_THROTTLE_*, REGISTER_THROTTLE_*, FORGOT_PASSWORD_THROTTLE_* |
| `src/email/providers/smtp.provider.ts` | 6 | EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_SECURE, EMAIL_FROM |
| `src/email/listeners/email.listener.ts` | 4 | FRONTEND_URL (×4) |
| `src/common/utils/index.ts` | 4 | NODE_ENV (×4) |
| `src/config/custom-module-options/config-module-option.ts` | 3 | JEST_WORKER_ID, NODE_ENV |
| `src/common/logger-config.ts` | 3 | NODE_ENV, DEBUG, LOG_LEVEL |
| `src/email/providers/resend.provider.ts` | 2 | RESEND_API_KEY, RESEND_FROM_EMAIL/EMAIL_FROM |
| `src/email/email.provider.factory.ts` | 2 | EMAIL_PROVIDER, NODE_ENV |
| `src/common/logger.ts` | 2 | LOG_LEVEL, NODE_ENV, DEBUG |
| `src/email/service/email.service.ts` | 1 | EMAIL_PROVIDER |
| `src/config/custom-module-options/mongoose-module-option.ts` | 1 | JEST_WORKER_ID |

### Why direct `process.env` is used (root causes):
1. **Decorators can't access DI** — `@Throttle()` in auth.controller.ts is evaluated at class definition time, before DI is available
2. **Email providers are plain classes** (not `@Injectable()`) — created via factory, can't receive ConfigService
3. **Standalone utilities** — `logger.ts`, `utils/index.ts`, `logger-config.ts` run outside NestJS DI context
4. **Developer inertia** — some files (email.listener.ts) are injectable but still use raw `process.env`

### Validation & Defaults
`env.validation.ts` defines a `EnvironmentVariables` class with `class-validator` decorators. It validates all env vars at startup via `ConfigModule.forRoot({ validate })`. Default values are applied for AUDIT_* and REDIS_* vars. This is well-designed but the validated types are not exported for reuse.

### Doppler Integration
The `Makefile` has Doppler support for downloading secrets into `.env.{ENV}` files during local development. In production, `ConfigModuleOption` sets `ignoreEnvFile: true` (via `isProd()`), relying on platform-injected env vars (e.g., Doppler runtime, Docker, K8s).

### No Existing ParameterService
No `ParameterService`, `AppConfigService`, or similar centralized config wrapper exists. The `ConfigService` from `@nestjs/config` is the closest thing, but it's generic (string keys, no type safety).

---

## Affected Areas

- `src/auth/auth.controller.ts` — heaviest process.env user (16 occurrences), but constrained by decorator evaluation timing
- `src/email/providers/smtp.provider.ts` — plain class, can't use DI
- `src/email/providers/resend.provider.ts` — plain class, can't use DI
- `src/email/email.provider.factory.ts` — factory function, outside DI
- `src/email/listeners/email.listener.ts` — injectable but uses raw process.env
- `src/email/service/email.service.ts` — injectable but uses raw process.env
- `src/common/logger.ts` — standalone utility, outside DI
- `src/common/logger-config.ts` — module-level function, outside DI
- `src/common/utils/index.ts` — pure utility functions
- `src/config/custom-module-options/config-module-option.ts` — bootstrap config, runs before DI
- `src/config/custom-module-options/mongoose-module-option.ts` — uses ConfigService mostly, one process.env for JEST_WORKER_ID
- `src/config/env.validation.ts` — validates env, types not exported

---

## Approaches

### 1. **Typed ConfigModule Wrapper (recommended)** — Create a typed configuration interface + a global `@Injectable()` service that wraps `ConfigService` with typed accessors

**Design:**
- Define a `AppConfig` interface with typed fields for every env var
- Create `AppConfigService` extending/wrapping `ConfigService`, with typed getters (e.g., `get throttle(): ThrottleConfig`)
- Export the validated config from `env.validation.ts` as the canonical type
- Make it `@Global()` so all modules can inject it
- For decorator contexts (throttle), use a `@Lazy()` wrapper or a module-level constant resolved at init time

**Pros:**
- Full type safety, autocompletion, compile-time errors on wrong keys
- Single source of truth (env.validation.ts becomes the config contract)
- Easy to test (mock one service vs. 44 process.env overrides)
- Follows NestJS conventions
- Minimal migration — ConfigService is already global, this is additive

**Cons:**
- Decorator limitation still exists (need a workaround for `@Throttle`)
- Slight increase in abstraction layer
- Email providers (plain classes) need refactoring to accept config via constructor

**Effort:** Medium

### 2. **Replace process.env with ConfigService everywhere** — Migrate all 44 direct usages to use the existing ConfigService via DI

**Design:**
- Make email providers `@Injectable()` and receive ConfigService
- Add `forwardRef` or lazy injection for decorator contexts
- Move standalone utilities to accept config as parameters

**Pros:**
- No new abstractions
- Uses existing @nestjs/config infrastructure directly

**Cons:**
- Still no type safety (ConfigService.get<string>('KEY'))
- Decorator limitation requires ugly workarounds
- Email provider refactoring is more invasive (factory pattern change)
- Every consumer needs to parse/convert types manually

**Effort:** Medium-High

### 3. **Config-as-Constants Module** — Resolve all env vars at bootstrap, expose as frozen typed constants

**Design:**
- In `main.ts` bootstrap, read all env vars via ConfigService
- Store in a module-level singleton (e.g., `APP_CONFIG`)
- Export constants that can be used anywhere (including decorators)

**Pros:**
- Works everywhere including decorators (constants, not DI)
- Simple mental model

**Cons:**
- Loses runtime flexibility (no hot-reload, though env vars are static anyway)
- Global mutable state pattern
- Harder to test (need to reset global state)
- Not NestJS-idiomatic

**Effort:** Low

---

## Recommendation

**Approach 1: Typed ConfigModule Wrapper** is the strongest path forward.

The rationale:
1. The `env.validation.ts` already defines the shape — we just need to export that type
2. A typed `AppConfigService` gives compile-time safety on every config access
3. The decorator limitation in `auth.controller.ts` can be solved with `ConfigModule`'s `cache: true` + reading values in a `OnModuleInit` hook that stores them in a static map (or simply keep the current pattern for decorators since they're bootstrap-time constants anyway)
4. The email provider refactoring (plain class → injectable) is a worthwhile cleanup regardless

**For the decorator constraint specifically:** The `@Throttle()` values are computed at class decoration time. The cleanest solution is a `@ModuleConfig()` custom decorator that reads from a resolved config map initialized during `APP_INITIALIZER`. Alternatively, keep the `process.env` in decorators as a documented exception — these values are validated at startup and never change at runtime.

---

## Risks

1. **Decorator timing** — `@Throttle()` decorators in `auth.controller.ts` evaluate before DI. A ParameterService cannot be injected there. Options: (a) keep process.env in decorators as documented exception, (b) create a static config map initialized in `APP_INITIALIZER`, or (c) move throttle config to a middleware/guard instead of decorators.
2. **Email provider refactoring** — `SmtpProvider` and `ResendProvider` are plain classes instantiated by a factory. Making them injectable changes the factory pattern. This is a necessary but non-trivial refactor.
3. **Standalone logger** — `createStandaloneLogger()` runs outside DI (used by microservice factory). It will still need process.env or a config parameter. This is acceptable as a documented edge case.
4. **Test impact** — Existing tests that mock `process.env` directly will need updating. The `env.validation.spec.ts` and `mongoose-module-option.spec.ts` already test config validation, so the migration surface is manageable.

---

## Ready for Proposal

**Yes.** The codebase has a clear problem (44 scattered `process.env` usages with no type safety), an existing foundation to build on (`env.validation.ts` + global `ConfigModule`), and a well-understood recommended approach. The orchestrator should proceed to proposal.
