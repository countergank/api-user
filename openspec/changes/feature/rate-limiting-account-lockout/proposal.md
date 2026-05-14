# Proposal: Rate Limiting & Account Lockout

## Intent

Protect public auth endpoints against brute-force attacks. Currently, login, register, forgot-password, and verify-email have zero rate limiting — attackers can brute-force credentials without friction.

## Scope

### In Scope
- Install `@nestjs/throttler` with in-memory storage, apply to all auth endpoints
- Stricter limits on login/forgot-password, relaxed on register/verify/reset
- Track failed login attempts in User document (`failedLoginAttempts`, `lockedUntil`)
- Lock account after N consecutive failures (default 5) for configurable duration (default 15 min)
- Auto-unlock after period expires; reset counter on successful login
- Admin endpoint to manually unlock accounts
- `Retry-After` headers on 429 responses; i18n messages (es/en/pt) for lockout and rate-limit errors

### Out of Scope
- Redis-backed throttler storage (deferred)
- IP-based banning or blocklisting
- Rate limiting on non-auth endpoints

## Capabilities

### New Capabilities
- `rate-limiting`: Request throttling with configurable TTL and limits per endpoint type
- `account-lockout`: Consecutive failed-login tracking, auto-lock, auto-unlock, manual unlock

### Modified Capabilities
None — existing i18n specs unchanged; only new translation keys added under current patterns.

## Approach

1. Install `@nestjs/throttler` v5+ (storage-based API, compatible with NestJS 10). Register `ThrottlerModule` in `AppModule`.
2. Apply `@Throttle()` decorators on auth controller endpoints with per-endpoint limits.
3. Add `failedLoginAttempts: number` (default 0) and `lockedUntil?: Date` to User entity.
4. Modify `AuthService.login()` flow: check lockout → validate credentials → increment on failure → reset on success.
5. Create `AccountLockedException` extending `HttpException` (HTTP 423) with i18n key. Update API docs with new 429 and 423 responses.
6. Add `POST /auth/admin/unlock/:userId` guarded by admin role.
7. Add env vars: `THROTTLE_TTL`, `THROTTLE_LIMIT`, `LOGIN_THROTTLE_TTL`, `LOGIN_THROTTLE_LIMIT`, `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/app.module.ts` | Modified | Import ThrottlerModule |
| `src/auth/auth.service.ts` | Modified | Lockout logic in login() |
| `src/auth/auth.controller.ts` | Modified | Throttle decorators, admin unlock endpoint |
| `src/auth/api-docs/` | Modified | New 429/423 response docs |
| `src/user/entities/user.entity.ts` | Modified | `failedLoginAttempts`, `lockedUntil` fields |
| `src/config/env.validation.ts` | Modified | New throttle/lockout env vars |
| `src/common/errors/` | New | AccountLockedException |
| `src/common/i18n/translations/` | Modified | New rate-limit and lockout error keys |
| `package.json` | Modified | Add `@nestjs/throttler` dependency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| In-memory throttler state lost on restart | Med | Documented limitation; Redis path already designed |
| Lockout fields require migration | Low | Default values (0, undefined) are backward-compatible |
| Login error message change | Low | New distinct 423 code; "invalid credentials" unchanged |

## Rollback Plan

1. Remove `@nestjs/throttler` from dependencies and `ThrottlerModule` import
2. Remove `@Throttle()` decorators from auth controller
3. Revert `AuthService.login()` to original (remove lockout checks)
4. Remove `failedLoginAttempts` and `lockedUntil` from User entity (no schema migration needed)
5. Drop new env vars from validation class

## Dependencies

- `@nestjs/throttler` (npm, not yet installed)
- No external services required

## Success Criteria

- [ ] Login returns 429 with `Retry-After` header after exceeding rate limit
- [ ] Account locks after N consecutive failures (default 5)
- [ ] Locked account returns 423 with distinct i18n message in es/en/pt
- [ ] Successful login resets failed counter to 0
- [ ] Auto-unlock after lockout duration expires
- [ ] Admin can manually unlock via dedicated endpoint
- [ ] All thresholds configurable via environment variables
