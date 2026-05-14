# Implementation Tasks: Rate Limiting & Account Lockout

## Overview

This document breaks down the SDD change **rate-limiting-account-lockout** into implementation tasks grouped by phase. Each task includes spec references, acceptance criteria, line estimates, and dependencies.

---

## Phase 1: Foundation

### 1.1 Install @nestjs/throttler dependency

**Spec References:** RL-09, Design Decision #1

**Description:** Install `@nestjs/throttler` v5.x compatible with NestJS 10.

**Acceptance Criteria:**
- [x] `@nestjs/throttler@^5.x` added to `package.json` dependencies
- [x] `npm install` completes without errors
- [x] Version is pinned to v5.x (not v6.x which has breaking changes)

**Estimated Changed Lines:** ~2 lines (package.json)

**Dependencies:** None

---

### 1.2 Add throttle and lockout environment variables

**Spec References:** RL-04, AL-05, Design Interfaces/Contracts

**Description:** Add validation for 8 new environment variables in `env.validation.ts`.

**Acceptance Criteria:**
- [x] `THROTTLE_TTL` (default: 60) added with validation
- [x] `THROTTLE_LIMIT` (default: 10) added with validation
- [x] `LOGIN_THROTTLE_TTL` (default: 60) added with validation
- [x] `LOGIN_THROTTLE_LIMIT` (default: 5) added with validation
- [x] `FORGOT_PASSWORD_THROTTLE_TTL` (default: 60) added with validation
- [x] `FORGOT_PASSWORD_THROTTLE_LIMIT` (default: 3) added with validation
- [x] `MAX_LOGIN_ATTEMPTS` (default: 5) added with validation
- [x] `LOCKOUT_DURATION_MINUTES` (default: 15) added with validation
- [x] All vars have proper type conversion (number) and defaults

**Estimated Changed Lines:** ~40 lines (env.validation.ts)

**Dependencies:** None

---

### 1.3 Create AccountLockedException class

**Spec References:** AL-11, Error Codes table

**Description:** Create new exception class extending `HttpException` for locked accounts.

**Acceptance Criteria:**
- [x] File created at `src/common/errors/account-locked.exception.ts`
- [x] Extends `HttpException` with status 423
- [x] Constructor passes 'ACCOUNT_LOCKED' message for i18n translation
- [x] Follows existing error class patterns in the project

**Estimated Changed Lines:** ~10 lines (new file)

**Dependencies:** None

---

### 1.4 Add lockout fields to User entity

**Spec References:** AL-09, User Entity Changes table

**Description:** Add `failedLoginAttempts` and `lockedUntil` fields to User schema.

**Acceptance Criteria:**
- [x] `failedLoginAttempts: number` added with `@Prop({ default: 0 })`
- [x] `lockedUntil?: Date` added with `@Prop({ type: Date, default: undefined })`
- [x] Fields are optional (backward-compatible, no migration needed)
- [x] TypeScript interface updated to reflect new fields

**Estimated Changed Lines:** ~8 lines (user.entity.ts)

**Dependencies:** None

---

### 1.5 Configure ThrottlerModule in AppModule

**Spec References:** RL-09, Design Data Flow

**Description:** Import and configure `ThrottlerModule.forRoot()` in AppModule with default values from env vars.

**Acceptance Criteria:**
- [x] `ThrottlerModule` imported from `@nestjs/throttler`
- [x] `ThrottlerModule.forRoot()` configured in imports array
- [x] Uses `THROTTLE_TTL` and `THROTTLE_LIMIT` env vars as defaults
- [x] `ThrottlerGuard` registered as global guard (or in providers)
- [x] Module compiles without errors

**Estimated Changed Lines:** ~15 lines (app.module.ts)

**Dependencies:** 1.1, 1.2

---

## Phase 2: Implementation - Rate Limiting

### 2.1 Apply @Throttle() decorators to auth endpoints

**Spec References:** RL-01, RL-02, RL-03, RL-06, RL-08

**Description:** Add `@Throttle()` decorators to all 8 public auth endpoints with appropriate limits.

**Acceptance Criteria:**
- [x] POST /auth/login: `@Throttle({ default: { limit: LOGIN_THROTTLE_LIMIT, ttl: LOGIN_THROTTLE_TTL } })`
- [x] POST /auth/forgot-password: `@Throttle({ default: { limit: FORGOT_PASSWORD_THROTTLE_LIMIT, ttl: FORGOT_PASSWORD_THROTTLE_TTL } })`
- [x] POST /auth/register: `@Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })`
- [x] POST /auth/reset-password: `@Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })`
- [x] POST /auth/verify-email: `@Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })`
- [x] POST /auth/confirm-email-change: `@Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })`
- [x] POST /auth/resend-verification: `@Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })`
- [x] POST /auth/refresh: `@Throttle({ default: { limit: THROTTLE_LIMIT, ttl: THROTTLE_TTL } })`
- [x] Decorators use per-endpoint config (not global defaults)

**Estimated Changed Lines:** ~24 lines (auth.controller.ts)

**Dependencies:** 1.1, 1.2, 1.5

---

### 2.2 Add rate limiting i18n translations

**Spec References:** RL-10, i18n Translation Keys

**Description:** Add `errors.RATE_LIMITED` translation keys to all three language files.

**Acceptance Criteria:**
- [x] `en.json`: "Too many requests. Please try again in {{retryAfter}} seconds."
- [x] `es.json`: "Demasiadas solicitudes. Por favor intenta de nuevo en {{retryAfter}} segundos."
- [x] `pt.json`: "Muitas solicitações. Por favor tente novamente em {{retryAfter}} segundos."
- [x] All translations use `{{retryAfter}}` placeholder for dynamic value

**Estimated Changed Lines:** ~6 lines (3 translation files × 2 lines each)

**Dependencies:** None

---

### 2.3 Add 429 response documentation to API docs

**Spec References:** RL-01 through RL-08, Affected Endpoints table

**Description:** Add `@ApiTooManyRequestsResponse()` or equivalent to all auth endpoint decorators.

**Acceptance Criteria:**
- [x] All 8 auth endpoints have 429 response documented
- [x] Response includes `Retry-After` header documentation
- [x] References `errors.RATE_LIMITED` in response schema
- [x] Follows existing API docs pattern (e.g., `@ApplyLoginDoc()`)

**Estimated Changed Lines:** ~32 lines (auth decorator files)

**Dependencies:** 2.1, 2.2

---

## Phase 3: Implementation - Account Lockout

### 3.1 Implement lockout logic in AuthService.login()

**Spec References:** AL-01, AL-02, AL-03, AL-04, AL-07, AL-10, Design Data Flow

**Description:** Modify `login()` method to check lockout state, increment counter on failure, reset on success.

**Acceptance Criteria:**
- [ ] Lockout check happens BEFORE credential validation (AL-10)
- [ ] If `lockedUntil > now`, throw `AccountLockedException` (AL-03)
- [ ] If `lockedUntil` exists but expired, treat as unlocked (AL-04)
- [ ] On successful password validation: reset `failedLoginAttempts` to 0, clear `lockedUntil` (AL-02)
- [ ] On failed password validation: increment `failedLoginAttempts` (AL-01)
- [ ] If `failedLoginAttempts >= MAX_LOGIN_ATTEMPTS`, set `lockedUntil = now + LOCKOUT_DURATION` (AL-01)
- [ ] Non-existent user returns 401 without creating/modifying any user (AL-07)
- [ ] Uses i18n for error messages

**Estimated Changed Lines:** ~45 lines (auth.service.ts)

**Dependencies:** 1.3, 1.4, 1.2

---

### 3.2 Add account lockout i18n translations

**Spec References:** AL-10, i18n Translation Keys

**Description:** Add `errors.ACCOUNT_LOCKED` translation keys to all three language files.

**Acceptance Criteria:**
- [ ] `en.json`: "Account is temporarily locked due to too many failed login attempts. Please try again later or contact support."
- [ ] `es.json`: "La cuenta está temporalmente bloqueada debido a demasiados intentos fallidos de inicio de sesión. Por favor intenta más tarde o contacta a soporte."
- [ ] `pt.json`: "A conta está temporariamente bloqueada devido a muitas tentativas falhas de login. Por favor tente novamente mais tarde ou entre em contato com o suporte."

**Estimated Changed Lines:** ~6 lines (3 translation files × 2 lines each)

**Dependencies:** None

---

### 3.3 Create admin unlock endpoint

**Spec References:** AL-06, AL-07, Affected Endpoints table

**Description:** Add `POST /auth/admin/unlock/:userId` endpoint guarded by admin role.

**Acceptance Criteria:**
- [ ] Endpoint path: `POST /auth/admin/unlock/:userId`
- [ ] Requires authentication (Bearer token)
- [ ] Requires admin role (403 for non-admin per AL-07)
- [ ] Returns 200 with `{ message: "Account unlocked", userId, unlockedAt }` on success
- [ ] Returns 404 if user not found
- [ ] Resets `failedLoginAttempts` to 0 and clears `lockedUntil`
- [ ] Calls new `unlockUser()` method in AuthService

**Estimated Changed Lines:** ~25 lines (auth.controller.ts) + ~15 lines (auth.service.ts)

**Dependencies:** 1.3, 1.4, 3.2

---

### 3.4 Add 423 response documentation to login API docs

**Spec References:** AL-03, Affected Files (api-docs)

**Description:** Add 423 Locked response documentation to login endpoint.

**Acceptance Criteria:**
- [ ] Login endpoint has `@ApiResponse({ status: 423, ... })` documented
- [ ] Response schema includes `errors.ACCOUNT_LOCKED`
- [ ] Follows existing API docs pattern

**Estimated Changed Lines:** ~8 lines (auth decorator files)

**Dependencies:** 3.1, 3.2

---

## Phase 4: Testing

### 4.1 Unit tests: AccountLockedException

**Spec References:** AL-11

**Description:** Test the exception class returns correct status and message.

**Acceptance Criteria:**
- [ ] Test file created: `src/common/errors/account-locked.exception.spec.ts`
- [ ] Asserts HTTP status is 423
- [ ] Asserts message is 'ACCOUNT_LOCKED'
- [ ] Tests pass with `npm test`

**Estimated Changed Lines:** ~20 lines (new test file)

**Dependencies:** 1.3

---

### 4.2 Unit tests: AuthService lockout logic

**Spec References:** AL-01, AL-02, AL-03, AL-04, AL-07, AL-10

**Description:** Test lockout check, increment, reset, and auto-unlock logic.

**Acceptance Criteria:**
- [ ] Test file: `src/auth/auth.service.spec.ts` (new or modified)
- [ ] Test: locked account throws AccountLockedException (AL-03)
- [ ] Test: expired lockout allows login (AL-04)
- [ ] Test: successful login resets counter (AL-02)
- [ ] Test: N failed attempts locks account (AL-01)
- [ ] Test: non-existent user doesn't create counter (AL-07)
- [ ] Test: lockout check before credential validation (AL-10)
- [ ] All tests pass with `npm test`

**Estimated Changed Lines:** ~80 lines (auth.service.spec.ts)

**Dependencies:** 3.1

---

### 4.3 Integration tests: Rate limiting on auth endpoints

**Spec References:** RL-01, RL-02, RL-03, RL-05, RL-06, RL-07, RL-08

**Description:** Test throttler behavior on all auth endpoints using supertest.

**Acceptance Criteria:**
- [ ] Test file: `src/auth/auth.controller.spec.ts` or e2e file
- [ ] Test: login returns 429 after exceeding limit (RL-01)
- [ ] Test: register returns 429 after exceeding limit (RL-02)
- [ ] Test: forgot-password returns 429 after exceeding limit (RL-03)
- [ ] Test: 429 response includes Retry-After header (RL-05)
- [ ] Test: different endpoints have different limits (RL-06)
- [ ] Test: valid requests within limit pass normally (RL-07)
- [ ] All tests pass with `npm test`

**Estimated Changed Lines:** ~100 lines (test file)

**Dependencies:** 2.1

---

### 4.4 Integration tests: Account lockout flow

**Spec References:** AL-S01 through AL-S10

**Description:** Test full lockout flow using supertest against running app.

**Acceptance Criteria:**
- [ ] Test: account locks after N consecutive failures (AL-S01)
- [ ] Test: counter resets on success (AL-S02)
- [ ] Test: locked account returns 423 (AL-S03)
- [ ] Test: auto-unlock after duration (AL-S04)
- [ ] Test: admin can manually unlock (AL-S06)
- [ ] Test: admin unlock requires admin role (AL-S07)
- [ ] Test: non-existent user doesn't lock (AL-S08)
- [ ] All tests pass with `npm test`

**Estimated Changed Lines:** ~120 lines (test file)

**Dependencies:** 3.1, 3.3

---

### 4.5 Integration tests: Admin unlock endpoint

**Spec References:** AL-06, AL-07

**Description:** Test admin unlock endpoint authorization and functionality.

**Acceptance Criteria:**
- [ ] Test: admin token returns 200 and unlocks account
- [ ] Test: non-admin token returns 403
- [ ] Test: unauthenticated request returns 401
- [ ] Test: non-existent user returns 404
- [ ] All tests pass with `npm test`

**Estimated Changed Lines:** ~40 lines (test file)

**Dependencies:** 3.3

---

### 4.6 Test: Environment variable validation

**Spec References:** RL-04, AL-05

**Description:** Test that env vars are properly validated and have correct defaults.

**Acceptance Criteria:**
- [ ] Test: missing env vars use defaults
- [ ] Test: invalid values (non-numeric) throw validation error
- [ ] Test: custom values are respected
- [ ] All tests pass with `npm test`

**Estimated Changed Lines:** ~30 lines (env.validation.spec.ts)

**Dependencies:** 1.2

---

## Phase 5: Documentation

### 5.1 Update CHANGELOG or release notes

**Spec References:** Proposal Success Criteria

**Description:** Document the new rate limiting and account lockout features.

**Acceptance Criteria:**
- [ ] CHANGELOG.md updated with new feature section
- [ ] Lists all new environment variables
- [ ] Documents new 429 and 423 response codes
- [ ] Mentions backward compatibility (no migration needed)

**Estimated Changed Lines:** ~20 lines (CHANGELOG.md)

**Dependencies:** All implementation tasks

---

### 5.2 Update API documentation README

**Spec References:** Affected Endpoints tables (both specs)

**Description:** Update any API README or documentation files with new endpoints and responses.

**Acceptance Criteria:**
- [ ] Rate limiting behavior documented
- [ ] Account lockout behavior documented
- [ ] Admin unlock endpoint documented
- [ ] Default thresholds documented

**Estimated Changed Lines:** ~30 lines (API docs README)

**Dependencies:** All implementation tasks

---

## Task Dependency Graph

```
Phase 1 (Foundation):
  1.1 ──┬── 1.5 ──┬── 2.1 ──┬── 2.3 ──┬── 5.1
  1.2 ──┘         │         │         │      │
  1.3 ──┬── 3.1 ──┼── 3.3 ──┼── 3.4 ──┘      │
  1.4 ──┘         │         │                │
                  │         │                │
Phase 2 (Rate Limiting):    │                │
  2.2 ──────────────────────┘                │
                                             │
Phase 3 (Lockout):                           │
  3.2 ───────────────────────────────────────┘
                                             │
Phase 4 (Testing):                           │
  4.1 ──┬── 4.2 ──┬── 4.4 ───────────────────┘
  4.3 ──┘         │
  4.5 ────────────┘
  4.6

Phase 5 (Documentation):
  5.1, 5.2 (depend on all implementation)
```

---

## Review Workload Forecast

### Total Estimated Changed Lines

| Phase | Task | Estimated Lines |
|-------|------|-----------------|
| **Phase 1: Foundation** | | |
| | 1.1 Install @nestjs/throttler | 2 |
| | 1.2 Add env variables | 40 |
| | 1.3 Create AccountLockedException | 10 |
| | 1.4 Add lockout fields to User entity | 8 |
| | 1.5 Configure ThrottlerModule | 15 |
| | **Phase 1 Subtotal** | **75** |
| **Phase 2: Rate Limiting** | | |
| | 2.1 Apply @Throttle() decorators | 24 |
| | 2.2 Add rate limiting i18n | 6 |
| | 2.3 Add 429 API docs | 32 |
| | **Phase 2 Subtotal** | **62** |
| **Phase 3: Account Lockout** | | |
| | 3.1 Implement lockout logic | 45 |
| | 3.2 Add lockout i18n | 6 |
| | 3.3 Create admin unlock endpoint | 40 |
| | 3.4 Add 423 API docs | 8 |
| | **Phase 3 Subtotal** | **99** |
| **Phase 4: Testing** | | |
| | 4.1 Unit tests: AccountLockedException | 20 |
| | 4.2 Unit tests: AuthService lockout | 80 |
| | 4.3 Integration tests: Rate limiting | 100 |
| | 4.4 Integration tests: Lockout flow | 120 |
| | 4.5 Integration tests: Admin unlock | 40 |
| | 4.6 Test: Env validation | 30 |
| | **Phase 4 Subtotal** | **390** |
| **Phase 5: Documentation** | | |
| | 5.1 Update CHANGELOG | 20 |
| | 5.2 Update API README | 30 |
| | **Phase 5 Subtotal** | **50** |
| **TOTAL** | | **676 lines** |

### Budget Analysis

| Metric | Value |
|--------|-------|
| Total estimated changed lines | **~676 lines** |
| Project budget threshold | 400 lines |
| Exceeds budget? | **YES (+276 lines)** |

### Chained PR Recommendation

**Recommendation: YES, use chained PRs**

**Rationale:**
- Total changes (676 lines) exceed the 400-line budget by 69%
- Feature has two distinct capabilities (rate limiting + account lockout) that can be reviewed independently
- Strict TDD requirement means tests are ~58% of total changes — these should be reviewed separately from implementation

**Suggested PR Split:**

1. **PR #1: Foundation + Rate Limiting** (~200 lines)
   - Tasks: 1.1, 1.2, 1.5, 2.1, 2.2, 2.3
   - Tests: 4.3, 4.6
   - Docs: Partial 5.1

2. **PR #2: Account Lockout** (~250 lines)
   - Tasks: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4
   - Tests: 4.1, 4.2, 4.4, 4.5
   - Docs: Partial 5.1, 5.2

### Decision Needed Before Apply

| Question | Answer |
|----------|--------|
| Proceed with single PR or chained PRs? | **Chained PRs recommended** |
| Confirm TDD order (tests before implementation)? | **YES — strict TDD enabled** |
| Accept line estimates may vary ±20%? | **YES** |

---

## Notes

- All estimates are approximate and may vary based on existing code structure
- Test line counts assume supertest integration tests with proper setup/teardown
- Documentation tasks may expand if additional context is needed
- No database migration required (backward-compatible schema changes)
