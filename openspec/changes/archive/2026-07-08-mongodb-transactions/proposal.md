# Proposal: MongoDB Transactions, NoSQL Injection Fix, Query Optimization

## Intent

Wrap 5 critical multi-step write operations in MongoDB transactions to guarantee atomicity, fix a NoSQL injection vector in user search, and exclude password from 7 queries that fetch it unnecessarily. Linear COU-115 (parent COU-112).

## Scope

### In Scope
- Docker MongoDB standalone → replica set conversion (docker-compose + test config)
- Regex escape for `filters.search` in `user.repository.ts:164` (NoSQL injection)
- `.select('-password')` on 7 queries that don't need password
- Transaction wraps: `register`, `resetPassword`, `verifyEmail`, `confirmEmailChange`, `updateUser`
- `MongoMemoryServer` → `replSet` config for integration tests
- `MongooseModuleOption` replicaSet parameter
- Cleanup `as any` casts in `auth.service.ts` updates

### Out of Scope
- Email events in transactions (fire-and-forget via EventEmitter — cannot be transactional)
- Audit logging in transactions (async via events — separate concern)
- Seed script transactions (`populateUsers` — single write, no risk)
- `login` failed-attempt updates (non-critical, eventual consistency acceptable)
- `forgotPassword`, `resendVerification` (read + write but no cross-document dependency)

## Capabilities

### New Capabilities
- `mongodb-transactions`: Multi-step write operations MUST execute within a MongoDB client session with causal consistency. If any step fails, all writes MUST be rolled back.
- `mongodb-replica-set`: MongoDB MUST run as a single-node replica set in development and test environments to support transactions.
- `nosql-injection-prevention`: User-supplied search strings MUST be escaped before use in MongoDB regex queries.
- `password-exclusion`: Queries that do not require the password field MUST explicitly exclude it via `.select('-password')`.

### Modified Capabilities
- `auth-login`: `register`, `resetPassword`, `verifyEmail`, `confirmEmailChange` become transactional operations.
- `user-profile`: `updateUser` becomes a transactional operation.

## Approach

4-phase execution:

1. **Infra** (foundation): Convert docker-compose MongoDB to replica set (`--replSet rs0`), update `MongooseModuleOption` with `replicaSet` param, configure `MongoMemoryServer` with `replSet` for tests.
2. **Quick wins** (low risk, high value): Escape regex in `findPaginated`, add `.select('-password')` to 7 repository queries.
3. **Core** (transaction wraps): Wrap 5 critical operations in `mongoose.startSession()` / `session.withTransaction()`. Inject `InjectConnection()` for session access.
4. **Cleanup**: Remove `as any` casts, verify all tests pass with replica set config.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modified | MongoDB service: add `--replSet rs0` command, rename container |
| `src/config/custom-module-options/mongoose-module-option.ts` | Modified | Add `replicaSet: 'rs0'` to MongooseModuleOptions |
| `test/helpers/index.ts` | Modified | `MongoMemoryServer.create({ binary: { version: '6.0.3' }, instance: { args: ['--replSet', 'rs0'] } })` |
| `src/user/repository/user.repository.ts` | Modified | Regex escape, `.select('-password')` on 7 queries, new `@InjectConnection()` for transactions |
| `src/auth/auth.service.ts` | Modified | Transaction wraps for 5 operations, remove `as any` casts |
| `src/user/service/user.service.ts` | Modified | Transaction wrap for `updateUser`, `requestEmailChange` |
| `src/user/user.module.ts` | Modified | May need `MongooseModule` connection import for transaction support |
| `src/**/*.spec.ts` | Modified | All integration tests using `MongoMemoryServer` need `replSet` config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Replica set init delays docker-compose startup | Medium | Add `command: ['--replSet', 'rs0']` + health check with `rs.initiate()` script |
| `MongoMemoryServer` replSet not supported in current version | Low | Pin `mongodb-memory-server` version, verify `replSet` support (v9+ supports it) |
| Transaction overhead on simple operations | Low | Only wrap the 5 critical operations; login/forgotPassword remain non-transactional |
| Test suite slowdown with replSet init | Medium | Reuse single `mongod` instance across test files via jest globalSetup |
| Breaking change for developers without replica set | High | Update `.env.example` and README with `docker compose up` instructions |

## Rollback Plan

1. **Docker**: Revert `docker-compose.yml` — remove `--replSet rs0` command, restore standalone MongoDB. Existing data remains compatible (standalone can read replica set data).
2. **Mongoose config**: Remove `replicaSet` from `mongoose-module-option.ts` — Mongoose connects to standalone without it.
3. **Session wraps**: Revert transaction code in services — operations still work without sessions (they were working before, just not atomically). The `@InjectConnection()` injection is additive and safe.
4. **Test helpers**: Revert `MongoMemoryServer` config to standalone — tests pass without replSet.
5. **Regex escape + select**: These are pure improvements — keep them on rollback (no downside).

## Dependencies

- None from other cycles (Cycle 1 and Cycle 2 already merged)
- Requires `mongodb-memory-server` v9+ for `replSet` support (verify current version)

## Task Breakdown Forecast

| Phase | Tasks | Est. Lines |
|-------|-------|------------|
| Infra | docker-compose, mongoose option, test helper replSet | ~80 |
| Quick wins | Regex escape utility, 7x `.select('-password')` | ~60 |
| Core | 5 transaction wraps, connection injection, `as any` cleanup | ~200 |
| Cleanup | Test fixes, integration test replSet config | ~100 |
| **Total** | **~12 tasks** | **~440 lines** |

## Success Criteria

- [ ] `docker compose up` starts MongoDB as replica set (`rs.status()` returns ok)
- [ ] All 5 critical operations roll back fully on any step failure
- [ ] `npm test` passes with `MongoMemoryServer` replSet config
- [ ] No NoSQL injection: search with `.*$^+?{}()|[]\` returns zero results, not regex operators
- [ ] Password field absent from `findAll`, `findPaginated`, `findById`, `findByEmail`, `findByEmailVerificationToken`, `findByPendingEmailToken`, `findByResetToken` responses
- [ ] Zero `as any` casts remaining in `auth.service.ts` update calls
- [ ] No regression in login, forgotPassword, or resendVerification (non-transactional operations still work)
