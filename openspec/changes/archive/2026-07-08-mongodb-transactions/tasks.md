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

- [x] 1.1 `docker-compose.yml`: Add `command: ["--replSet", "rs0"]` to MongoDB service; add init script volume for `rs.initiate()`
- [x] 1.2 `test/helpers/index.ts`: Configure `MongoMemoryReplSet.create({ replSet: { count: 1 } })` in test setup
- [x] 1.3 `src/config/custom-module-options/mongoose-module-option.ts`: Append `&replicaSet=rs0` to connection URI
- [x] 1.4 Test: Verify `npm test` passes with replSet-enabled MongoMemoryReplSet

## Phase 2: Quick Wins — Data Integrity (TDD)

- [x] 2.1 `src/common/utils/regex.ts`: Create `escapeRegExp(str)` — escape `[.*+?^${}()|[\]\\]` to literal
- [x] 2.2 `src/user/repository/user.repository.ts`: Replace raw `new RegExp(search)` with `new RegExp(escapeRegExp(search))`
- [x] 2.3 `src/user/entities/user.entity.ts`: Add `select: false` to `@Prop()` on password field
- [x] 2.4 `src/user/repository/user.repository.ts`: Add `includePassword?: boolean` param to `findById` and `findByEmail`; use `.select('+password')` when true
- [x] 2.5 Password excluded by default via schema `select: false` — no per-query `.select('-password')` needed
- [x] 2.6 Test: Regex escape — special chars produce literal match; empty string skipped
- [x] 2.7 Test: Password exclusion — queries return no `password` field; `includePassword=true` includes it

## Phase 3: Core — Transaction Wraps (TDD)

- [x] 3.1 N/A — session passed via runInTransaction helper, not as method param
- [x] 3.2 `src/common/utils/transaction.ts`: `runInTransaction<T>(connection, callback)` with graceful degradation fallback
- [x] 3.3 `src/auth/auth.module.ts`: Import `MongooseModule` to enable `@InjectConnection()`
- [x] 3.4 Wrap `register()`: transaction around `createWithRole` + `findByIdAndUpdate`; events OUTSIDE
- [x] 3.5 Wrap `resetPassword()`: transaction around password update + clear token; event OUTSIDE
- [x] 3.6 Wrap `verifyEmail()`: transaction around activate + clear token
- [x] 3.7 Wrap `confirmEmailChange()`: transaction around apply email + clear pending; event OUTSIDE
- [x] 3.8 `src/user/service/user.service.ts`: Inject `@InjectConnection()`; wrap `updateUser()` for TOCTOU protection
- [x] 3.9 Test: `runInTransaction` — verify session lifecycle call order; verify re-throw on error
- [x] 3.10 Test: Graceful degradation — mock `startSession` to reject; assert fallback
- [x] 3.11 Covered by existing integration tests with MongoMemoryReplSet

## Phase 4: Integration Verification

- [x] 4.1 Run `npm test` — 339/339 pass
- [x] 4.2 Run `npx tsc --noEmit` — zero errors
- [x] 4.3 Graceful degradation built into runInTransaction — startSession failure → non-transactional fallback
- [x] 4.4 No `as any` casts in transaction wrapping (only pre-existing casts in update calls preserved)

## Work-Unit Commits

| PR | Commit message |
|----|---------------|
| PR 1 | `feat(infra): configure MongoDB replica set for transaction support` |
| PR 1 | `fix(user): escape regex input and exclude password from queries` |
| PR 2 | `feat(auth): wrap register, resetPassword, verifyEmail, confirmEmailChange in transactions` |
| PR 2 | `feat(user): wrap updateUser in transaction for TOCTOU protection` |
| PR 3 | `test: add transaction rollback and graceful degradation tests` |
