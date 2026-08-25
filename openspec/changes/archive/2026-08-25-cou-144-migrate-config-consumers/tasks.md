# Tasks: COU-144 — Migrate config consumers

## Task 1: Parameter Definitions — Register email & throttle params

**Files:**
- `src/config/parameters/parameter-definitions.ts` ✅
- `src/config/parameters/__tests__/parameter-registry.spec.ts` ✅

**Description:** Add 13 new parameter definitions covering email config (EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_FROM, RESEND_FROM_EMAIL) and throttle config (THROTTLE_LIMIT, THROTTLE_TTL, LOGIN_THROTTLE_LIMIT, LOGIN_THROTTLE_TTL, REGISTER_THROTTLE_LIMIT, REGISTER_THROTTLE_TTL, FORGOT_PASSWORD_THROTTLE_LIMIT, FORGOT_PASSWORD_THROTTLE_TTL).

**Acceptance:** All params registered with correct types, defaults, validation, and env var mapping. Existing tests still pass.

**Complexity:** Low — **DONE**

---

## Task 2: Email Module — Refactor providers to use DI config

**Files:**
- `src/email/email.module.ts` ✅
- `src/email/email.provider.factory.ts` ✅
- `src/email/providers/smtp.provider.ts` ✅
- `src/email/providers/resend.provider.ts` ✅
- `src/email/interfaces/email-provider-config.interface.ts` ✅ (NEW)

**Description:**
- Create `EmailProviderConfig` interface ✅
- Refactor `SmtpProvider` constructor to receive config ✅
- Refactor `ResendProvider` constructor to receive config (fromEmail only, API key stays in env) ✅
- Refactor `EmailProviderFactory` and `EmailModule` to use async `useFactory` injecting `ParameterService` ✅
- Providers receive config object instead of reading `process.env` ✅

**Acceptance:** EmailService works with injected config. No process.env reads in provider files (except RESEND_API_KEY which stays).

**Complexity:** Medium — **DONE**

---

## Task 3: DynamicThrottlerGuard — Create custom throttle guard with sync cache

**Files:**
- `src/config/throttle/dynamic-throttler.guard.ts` ✅ (NEW)
- `src/config/throttle/__tests__/dynamic-throttler.guard.spec.ts` ✅ (NEW)
- `src/app/app.module.ts` ✅

**Description:**
- Create `DynamicThrottlerGuard` extending `ThrottlerGuard` ✅
- Add sync `Map<string, { limit, ttl }>` populated from `ParameterService` on `onModuleInit()` ✅
- Override `handleRequest()` to read from configMap with route-based key mapping ✅
- Update `ThrottlerModule.forRoot()` in `app.module.ts` to use static defaults + APP_GUARD ✅
- Map routes: global, login, register, forgot-password ✅

**Acceptance:** Guard loads config from ParameterService on startup. Route matching works. Falls back to global defaults.

**Complexity:** High — **DONE**

---

## Task 4: Auth Controller — Remove static @Throttle decorators

**Files:**
- `src/auth/auth.controller.ts` ✅
- `src/auth/auth.controller.spec.ts` ✅

**Description:**
- Remove all `@Throttle()` decorators from controller methods (login, register, forgotPassword) ✅
- The `DynamicThrottlerGuard` handles limits per-route now ✅
- Update tests to remove process.env mocks ✅

**Acceptance:** No @Throttle decorators in controller. All throttle config comes from ParameterService via guard.

**Complexity:** Low — **DONE**

---

## Task 5: Update remaining tests for new DI patterns

**Files:**
- `src/email/__tests__/email.service.spec.ts` ✅ (already compatible)
- `src/email/__tests__/email.listener.spec.ts` ✅ (already compatible)
- `src/email/__tests__/email.provider.factory.spec.ts` ✅ (NEW)
- `src/email/__tests__/smtp.provider.spec.ts` ✅ (NEW)

**Description:**
- Update email tests to provide mock config objects / mock ParameterService ✅
- Remove process.env mocking that's no longer needed ✅
- Added new factory and provider tests ✅

**Acceptance:** All email tests pass with new DI setup. All tests pass.

**Complexity:** Medium — **DONE**

---

## Review Workload Forecast

- Estimated changed lines: ~150-200
- 400-line budget: within budget → single PR
- Risk: Medium (throttle guard is new, email refactor touches critical paths)
- Chained PRs: Not needed
