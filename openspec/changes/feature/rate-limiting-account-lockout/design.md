# Design: Rate Limiting & Account Lockout

## Technical Approach

Apply `@nestjs/throttler` v5 to all public auth endpoints with per-endpoint configurable limits. Track failed-login attempts in the User document via two new Mongoose fields (`failedLoginAttempts`, `lockedUntil`). Modify `AuthService.login()` to check lockout state before credential validation. Create `AccountLockedException` (HTTP 423) for locked accounts. Add admin unlock endpoint. All error messages use existing I18nService with new translation keys. Strict TDD: tests written before implementation.

## Architecture Decisions

### Decision: Rate limiter library

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@nestjs/throttler` v5 | Decorator API, Fastify-compatible, built-in `Retry-After` header, per-endpoint limits via `@Throttle()` | **Chosen** |
| Custom Fastify hook | Full control but no NestJS guard/decorator integration, more code to maintain | Rejected |

**Rationale**: The project already uses NestJS decorators (`@ApplyLoginDoc()`, `@HttpCode()`). `@Throttle()` follows the same pattern. V5 provides `ThrottlerGuard` and `@SkipThrottle()` without needing custom middleware. In-memory storage with extensibility path for Redis via `ThrottlerStorage`.

### Decision: Lockout storage location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| User document (Mongoose) | Persistent across restarts, visible in admin views, no extra collection | **Chosen** |
| In-memory Map | Lost on restart, harder to surface in admin UI | Rejected |

**Rationale**: Spec AL-08 requires lockout state visible in admin views. User document is already the canonical user state store. Two optional fields (`failedLoginAttempts` default 0, `lockedUntil` default undefined) are backward-compatible — no migration needed.

### Decision: AccountLockedException vs UnauthorizedException

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Extend `HttpException` | Works with existing `ErrorFilter` i18n path: translates `errors.{message}`, simple constructor | **Chosen** |
| Extend `ErrorBase` | Requires new error code in `ErrorBaseEnum`, more complex but more structured | Rejected |

**Rationale**: `ErrorFilter` already handles `HttpException` by looking up `errors.{response.message}` in i18n. Throwing `new AccountLockedException('ACCOUNT_LOCKED')` automatically resolves to `errors.ACCOUNT_LOCKED` translation. No changes needed to `ErrorFilter`.

## Data Flow

```
POST /auth/login
    │
    ▼
ThrottlerGuard (per-IP, 5 req/60s)
    │
    ├── exceeded? → 429 + Retry-After header
    │
    ▼
AuthService.login(email, password)
    │
    ▼
UserService.findByEmail(email)
    │
    ├── not found? → 401 "Invalid credentials"
    │
    ▼
is locked? (lockedUntil > now)
    │
    ├── locked? → throw AccountLockedException → 423 + i18n
    │
    ▼
validatePassword(password, user.password)
    │
    ├── valid? → reset counter, clear lockedUntil, return tokens → 200
    │
    └── invalid? → increment failedLoginAttempts
                     │
                     ├── >= MAX_ATTEMPTS? → set lockedUntil = now + DURATION
                     │
                     └── throw UnauthorizedException → 401
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@nestjs/throttler` v5 dependency |
| `src/app/app.module.ts` | Modify | Import `ThrottlerModule.forRoot()` with default TTL/limit |
| `src/auth/auth.controller.ts` | Modify | Add `@Throttle()` decorators to 8 endpoints; add `POST /auth/admin/unlock/:userId` |
| `src/auth/auth.module.ts` | Modify | Import `ThrottlerModule` if needed (ThrottlerGuard is global) |
| `src/auth/auth.service.ts` | Modify | Lockout check/increment/reset in `login()`; new `unlockUser()` method |
| `src/user/entities/user.entity.ts` | Modify | Add `failedLoginAttempts: number` (default 0) and `lockedUntil?: Date` |
| `src/common/errors/account-locked.exception.ts` | Create | `AccountLockedException` extends `HttpException` (HTTP 423) |
| `src/config/env.validation.ts` | Modify | Add 6 new env vars: `THROTTLE_TTL`, `THROTTLE_LIMIT`, `LOGIN_THROTTLE_TTL`, `LOGIN_THROTTLE_LIMIT`, `FORGOT_PASSWORD_THROTTLE_TTL`, `FORGOT_PASSWORD_THROTTLE_LIMIT`, `MAX_LOGIN_ATTEMPTS`, `LOCKOUT_DURATION_MINUTES` |
| `src/auth/api-docs/auth.decorator.ts` | Modify | Add `@ApiTooManyRequestsResponse()` to all endpoints; add `@ApiResponse({ status: 423 })` to login |
| `src/auth/api-docs/examples/` | Create/modify | New examples for unlock response |
| `src/common/i18n/translations/en.json` | Modify | Add `errors.RATE_LIMITED` and `errors.ACCOUNT_LOCKED` keys |
| `src/common/i18n/translations/es.json` | Modify | Add `errors.RATE_LIMITED` and `errors.ACCOUNT_LOCKED` keys |
| `src/common/i18n/translations/pt.json` | Modify | Add `errors.RATE_LIMITED` and `errors.ACCOUNT_LOCKED` keys |

## Interfaces / Contracts

### User Entity — new fields
```typescript
@Prop({ default: 0 })
failedLoginAttempts: number;

@Prop({ type: Date, default: undefined })
lockedUntil?: Date;
```

### AccountLockedException
```typescript
export class AccountLockedException extends HttpException {
  constructor() {
    super('ACCOUNT_LOCKED', 423);
  }
}
```

### Admin unlock endpoint
```
PATCH /auth/admin/unlock/:userId
Auth: Bearer token (admin role)
Response 200: { message: "Account unlocked", userId, unlockedAt }
Response 403: Forbidden (non-admin)
Response 404: User not found
```

### Env vars (new)
| Variable | Default | Type |
|----------|---------|------|
| `THROTTLE_TTL` | `60` | seconds, general limit window |
| `THROTTLE_LIMIT` | `10` | requests per window (register, verify, etc.) |
| `LOGIN_THROTTLE_TTL` | `60` | seconds, login window |
| `LOGIN_THROTTLE_LIMIT` | `5` | requests per login window |
| `FORGOT_PASSWORD_THROTTLE_TTL` | `60` | seconds, forgot-password window |
| `FORGOT_PASSWORD_THROTTLE_LIMIT` | `3` | requests per forgot-password window |
| `MAX_LOGIN_ATTEMPTS` | `5` | consecutive failures before lock |
| `LOCKOUT_DURATION_MINUTES` | `15` | minutes until auto-unlock |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `AuthService.login()` lockout logic | Mock `UserService`, test locked/unlocked/reset paths |
| Unit | `AccountLockedException` | Assert status 423 and message |
| Unit | Env validation | Test missing/invalid env var values |
| Integration | ThrottlerGuard on endpoints | Supertest: exceed limit, assert 429 + `Retry-After` |
| Integration | Login lockout flow | Supertest: N failed → 423, success → reset, auto-unlock |
| Integration | Admin unlock | Supertest: admin token → 200, non-admin → 403 |
| E2E | Full rate-limit + lockout interaction | Rate-limiting blocks BEFORE lockout check triggers |

## Migration / Rollout

No data migration required. New User fields have defaults (`0`, `undefined`). `@nestjs/throttler` uses in-memory storage — cold start is clean. Rollback: remove throttler, remove fields, revert `login()` — no DB schema migration needed.

## Open Questions

- [ ] Should `failedLoginAttempts` and `lockedUntil` be visible in self-profile endpoint (`GET /users/me`)? Spec AL-09 says "MAY". Recommend: yes, include them so users understand why they're locked.
- [ ] `@nestjs/throttler` v5.2.x vs v6.x? V6 changed the storage API. With NestJS 10, v5.2.x is the safe choice. Verify npm availability before `npm install`.
