# Tasks: MongoDB Transactions and Data Integrity

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~440 (12 files, 5 transaction wraps, test updates) |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Infra + Quick Wins) → PR 2 (Core transactions) → PR 3 (Verification) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Replica set infra + regex escape + password exclusion | PR 1 | Base: main. ~160 lines. Tests included. |
| 2 | Transaction wraps for 5 operations | PR 2 | Base: main (after PR 1 merge). ~220 lines. Core logic. |
| 3 | Integration verification + graceful degradation tests | PR 3 | Base: main (after PR 2 merge). ~60 lines. Final green. |

## Phase 1: Infrastructure — Replica Set

- [ ] 1.1 `docker-compose.yml`: Add `command: ["--replSet", "rs0"]` to MongoDB service; add init script volume for `rs.initiate()`
- [ ] 1.2 `test/helpers/index.ts`: Configure `MongoMemoryServer.create({ instance: { args: ['--replSet', 'rs0'] } })` in test setup
- [ ] 1.3 `src/config/custom-module-options/mongoose-module-option.ts`: Append `?replicaSet=rs0` to connection URI when `DATABASE_REPLICA_SET=true`
- [ ] 1.4 Test: Verify `npm test` passes with replSet-enabled MongoMemoryServer

## Phase 2: Quick Wins — Data Integrity (TDD)

- [ ] 2.1 `src/common/utils/index.ts`: Create `escapeRegExp(str)` — escape `[.*+?^${}()|[\]\\]` to literal
- [ ] 2.2 `src/user/repository/user.repository.ts`: Replace raw `new RegExp(search)` at line ~164 with `new RegExp(escapeRegExp(search))`; skip empty strings
- [ ] 2.3 `src/user/entities/user.entity.ts`: Add `select: false` to `@Prop()` on password field
- [ ] 2.4 `src/user/repository/user.repository.ts`: Add `includePassword?: boolean` param to `findById` and `findByEmail`; use `.select('+password')` when true
- [ ] 2.5 `src/user/repository/user.repository.ts`: Add `.select('-password')` to `findAll`, `findPaginated`, `findByResetToken`, `findByEmailVerificationToken`, `findByPendingEmailToken`
- [ ] 2.6 Test: Regex escape — special chars `.*+?^${}()|[]\` produce literal match; empty string skipped
- [ ] 2.7 Test: Password exclusion — `findAll`/`findById`/token lookups return no `password` field; `includePassword=true` includes it

## Phase 3: Core — Transaction Wraps (TDD)

- [ ] 3.1 `src/user/repository/user.repository.ts`: Add optional `session?: ClientSession` param to all methods (`findById`, `findByEmail`, `findByResetToken`, `findByEmailVerificationToken`, `findByPendingEmailToken`, `existsByEmailExcludingSelf`, `existsByNameExcludingSelf`, `update`, `createWithRole`); pass `{ session }` to Mongoose calls
- [ ] 3.2 `src/auth/auth.service.ts`: Inject `@InjectConnection()`; add private `runInTransaction<T>(cb)` helper with `startSession` → `withTransaction` → `endSession` + graceful degradation fallback
- [ ] 3.3 `src/auth/auth.module.ts`: Import `MongooseModule` to enable `@InjectConnection()`
- [ ] 3.4 Wrap `register()`: transaction around `createWithRole` + `findByIdAndUpdate` (set verification token); emit events OUTSIDE transaction
- [ ] 3.5 Wrap `resetPassword()`: transaction around `findByResetToken` + `findByIdAndUpdate` (new password + clear token); emit event OUTSIDE
- [ ] 3.6 Wrap `verifyEmail()`: transaction around `findByEmailVerificationToken` + `findByIdAndUpdate` (activate + clear token)
- [ ] 3.7 Wrap `confirmEmailChange()`: transaction around `findByPendingEmailToken` + `findByIdAndUpdate` (apply email + clear pending); emit event OUTSIDE
- [ ] 3.8 `src/user/service/user.service.ts`: Inject `@InjectConnection()`; add `runInTransaction` helper; wrap `updateUser()`: transaction around uniqueness check + update (TOCTOU protection)
- [ ] 3.9 Test: `runInTransaction` — mock `Connection`, verify `startSession`/`withTransaction`/`endSession` call order; verify re-throw on error
- [ ] 3.10 Test: Graceful degradation — mock `startSession` to reject; assert fallback to non-transactional execution
- [ ] 3.11 Test: Transaction rollback — duplicate email in `register()` rolls back user creation; concurrent `updateUser` race: one commits, one throws

## Phase 4: Integration Verification

- [ ] 4.1 Run `npm test` — all unit + integration tests pass
- [ ] 4.2 Run `npx tsc --noEmit` — zero type errors
- [ ] 4.3 Verify standalone fallback: temporarily remove replSet config, confirm operations succeed without transactions
- [ ] 4.4 Remove any `as any` casts introduced during transaction wrapping

## Work-Unit Commits

| PR | Commit message |
|----|---------------|
| PR 1 | `feat(infra): configure MongoDB replica set for transaction support` |
| PR 1 | `fix(user): escape regex input and exclude password from queries` |
| PR 2 | `feat(auth): wrap register, resetPassword, verifyEmail, confirmEmailChange in transactions` |
| PR 2 | `feat(user): wrap updateUser in transaction for TOCTOU protection` |
| PR 3 | `test: add transaction rollback and graceful degradation tests` |
