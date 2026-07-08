# Design: MongoDB Transactions and Data Integrity

## Technical Approach

Wrap 5 critical multi-step write operations in MongoDB sessions with `session.withTransaction()` to guarantee atomicity. Add NoSQL injection sanitization for regex search queries. Exclude `password` field at the schema level to prevent accidental exposure. Configure MongoDB replica set for transaction support in dev/test.

Maps to proposal phases:
- **Phase 1 (Infra)**: docker-compose replSet, MongoMemoryServer test config
- **Phase 2 (Quick wins)**: regex escape, password select
- **Phase 3 (Core)**: 5 transaction wraps
- **Phase 4 (Cleanup)**: remove `as any` casts

## Architecture Decisions

### Decision: Connection injection via `@InjectConnection()`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@InjectConnection()` in AuthService | Direct access to `Connection.startSession()` | **Chosen** — minimal boilerplate, NestJS-native |
| Pass session through service layer | Adds `session?` param to every method signature | Rejected — pollutes public API |
| Custom provider wrapper | Extra abstraction layer | Rejected — overkill for single connection |

**Rationale**: `@InjectConnection()` from `@nestjs/mongoose` gives us the raw Mongoose `Connection` object. We call `connection.startSession()` inside service methods. No need to propagate session through method signatures — each transactional method owns its session lifecycle.

### Decision: Per-operation session lifecycle

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Each method creates/ends its own session | Self-contained, no shared state | **Chosen** — simple, testable, no leak risk |
| Shared session via CLS (nestjs-cls) | Cross-method transactions possible | Rejected — overkill, adds complexity, CLS already used for audit context |
| Session passed from controller | Explicit but verbose | Rejected — couples controller to transaction mechanics |

**Rationale**: Each operation (`register`, `resetPassword`, etc.) is a single logical unit of work. Creating a session per call keeps boundaries clear and avoids session leak bugs.

### Decision: Error handling — re-throw from `withTransaction()`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Re-throw all errors from `withTransaction()` | Caller handles, MongoDB auto-aborts on throw | **Chosen** — standard pattern, no silent failures |
| Catch and wrap in custom exception | Consistent error format | Rejected — loses original stack, redundant |
| Swallow and return null | Never lose data | Rejected — hides failures from caller |

**Rationale**: `session.withTransaction()` automatically aborts the transaction when the callback throws. We let the error bubble up — the existing `BadRequestException` / `UnauthorizedException` flow handles it. MongoDB guarantees the transaction is rolled back.

### Decision: `withTransaction()` helper function

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline `connection.withTransaction(async (session) => ...)` | Verbose, repeated 5+ times | Rejected |
| Private helper `runInTransaction<T>(cb)` in each service | DRY, explicit | **Chosen** — reduces boilerplate, keeps session management in one place |
| Global utility in `src/common/` | Reusable across modules | Rejected — ties to Mongoose, belongs in service layer |

**Rationale**: A private method per service (`runInTransaction`) encapsulates `startSession` → `withTransaction` → `finally endSession`. ~4 lines saved per call site.

### Decision: Graceful degradation — try-catch around `startSession()`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Try-catch: if `startSession()` fails, fall back to non-transactional | Works on standalone MongoDB | **Chosen** — zero config change for existing dev setups |
| Detect standalone via `connection.db.serverConfig` | Explicit detection | Rejected — fragile, internal API may change |
| Require replSet everywhere | Simplest code | Rejected — breaks existing dev environments |

**Rationale**: `connection.startSession()` throws on standalone MongoDB. We catch that error and execute the operation without a transaction. This means existing developers don't need to change their docker-compose. When they're ready, they add `--replSet rs0` and get full transaction safety.

### Decision: Password exclusion — schema-level `select: false`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Schema `@Prop({ select: false })` on password | Automatic, apply once | **Chosen** — single source of truth |
| Add `.select('-password')` to every query | Explicit per-query | Rejected — easy to forget, 7 queries already missing it |
| Post-query `delete user.password` | Runtime removal | Rejected — too late, already serialized |

**Rationale**: `select: false` on the schema property means Mongoose never includes `password` in query results by default. Queries that DO need the password (login, password validation) use `.select('+password')`. This is the Mongoose-recommended pattern.

### Decision: Regex escape — custom helper

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Custom `escapeRegExp()` in `src/common/utils/` | Zero dependencies, 3 lines | **Chosen** — no external dep needed |
| `escape-string-regexp` npm package | Battle-tested | Rejected — adds a dependency for a trivial function |
| No escaping | Current state | Rejected — NoSQL injection vector |

**Rationale**: The escape function is `string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. Three lines, zero dependencies. No reason to pull in a package.

### Decision: Replica set via connection string, not `MongooseModuleOptions`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `?replicaSet=rs0` to connection string | Simple, standard MongoDB URI | **Chosen** — single config change |
| Add `replicaSet` to `MongooseModuleOptions` object | Type-safe | Rejected — Mongoose ignores it without URI param |
| Separate env var for replica set URI | Flexible | Rejected — overcomplicates config |

**Rationale**: MongoDB connection string already supports `?replicaSet=rs0`. We add it conditionally based on environment. Dev without replSet uses the current URI. Dev/test with replSet appends the param.

## Data Flow

### Register Flow (with transaction)

```
AuthService.register()
  │
  ├─ startSession()
  │
  ├─ withTransaction(async (session) →
  │    │
  │    ├─ userService.existsByEmailOrUsername()  [read, no session needed]
  │    │    └─ throws if exists (abort transaction)
  │    │
  │    ├─ userRepository.createWithRole(data, session)  [write]
  │    │    └─ new this.userModel(doc).save({ session })
  │    │
  │    ├─ userRepository.findByIdAndUpdate(id, { verificationToken, ... }, { session })  [write]
  │    │
  │    └─ return user
  │
  ├─ session.endSession()  [finally]
  │
  └─ eventEmitter.emit(USER_REGISTERED)  [fire-and-forget, OUTSIDE transaction]
```

### resetPassword Flow

```
AuthService.resetPassword(token, newPassword)
  │
  ├─ startSession()
  │
  ├─ withTransaction(async (session) →
  │    │
  │    ├─ userRepository.findByResetToken(token)  [read]
  │    │    └─ throws if expired/invalid (abort)
  │    │
  │    ├─ encodeService.hash(newPassword)  [CPU-bound, no DB]
  │    │
  │    ├─ userRepository.findByIdAndUpdate(id, { password, resetPasswordToken: undef, ... }, { session })  [write]
  │    │
  │    └─ return
  │
  ├─ session.endSession()  [finally]
  │
  └─ eventEmitter.emit(PASSWORD_CHANGED)  [OUTSIDE transaction]
```

### verifyEmail Flow

```
AuthService.verifyEmail(token)
  │
  ├─ startSession()
  │
  ├─ withTransaction(async (session) →
  │    │
  │    ├─ userRepository.findByEmailVerificationToken(token)  [read]
  │    │    └─ throws if expired/invalid (abort)
  │    │
  │    ├─ userRepository.findByIdAndUpdate(id, { isActive: true, token: undef, expires: undef }, { session })  [write]
  │    │
  │    └─ return
  │
  └─ session.endSession()  [finally]
```

### confirmEmailChange Flow

```
AuthService.confirmEmailChange(token)
  │
  ├─ startSession()
  │
  ├─ withTransaction(async (session) →
  │    │
  │    ├─ userRepository.findByPendingEmailToken(token)  [read]
  │    │    └─ throws if expired/no pending email (abort)
  │    │
  │    ├─ userRepository.findByIdAndUpdate(id, { email: newEmail, pendingEmail: undef, ... }, { session })  [write]
  │    │
  │    └─ return
  │
  ├─ session.endSession()  [finally]
  │
  └─ eventEmitter.emit(EMAIL_CHANGE_CONFIRMED)  [OUTSIDE transaction]
```

### updateUser Flow (TOCTOU protection)

```
UserService.updateUser(id, dto)
  │
  ├─ startSession()
  │
  ├─ withTransaction(async (session) →
  │    │
  │    ├─ userRepository.findById(id, session)  [read]
  │    │    └─ throws if not found (abort)
  │    │
  │    ├─ if dto.email → existsByEmailExcludingSelf(email, id, session)  [read]
  │    │    └─ throws if conflict (abort)
  │    │
  │    ├─ if dto.userName → existsByNameExcludingSelf(name, id, session)  [read]
  │    │    └─ throws if conflict (abort)
  │    │
  │    ├─ userRepository.update(id, updateData, session)  [write]
  │    │
  │    └─ return user
  │
  └─ session.endSession()  [finally]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `docker-compose.yml` | Modify | Add `--replSet rs0` to MongoDB command; add `--keyFile` volume for replica set auth |
| `src/common/utils/index.ts` | Modify | Add `escapeRegExp(str: string): string` helper |
| `src/config/custom-module-options/mongoose-module-option.ts` | Modify | Append `?replicaSet=rs0` to URI when `DATABASE_REPLICA_SET=true` |
| `src/user/entities/user.entity.ts` | Modify | Add `{ select: false }` to `@Prop()` on password field |
| `src/user/repository/user.repository.ts` | Modify | Add optional `session?` param to all methods; add `.select('+password')` to findByEmail; sanitize regex in findPaginated |
| `src/user/service/user.service.ts` | Modify | Add `runInTransaction()` helper; wrap `updateUser()` in transaction; pass session to repository calls |
| `src/auth/auth.service.ts` | Modify | Inject `@InjectConnection()`; add `runInTransaction()` helper; wrap `register`, `resetPassword`, `verifyEmail`, `confirmEmailChange` in transactions; remove all `as any` casts |
| `src/auth/auth.module.ts` | Modify | Import `MongooseModule` to enable `@InjectConnection()` |
| `test/helpers/index.ts` | Modify | Add `createConnectionWithReplSet()` helper for MongoMemoryServer |
| `test/auth.e2e-spec.ts` | Modify | Add transaction-aware test assertions |
| `src/auth/auth.service.spec.ts` | Create | Unit tests with mocked `Connection.startSession()` |
| `src/user/service/user.service.spec.ts` | Modify | Add unit tests for `updateUser` with mocked session |

## Interfaces / Contracts

### New helper: `escapeRegExp`

```typescript
// src/common/utils/index.ts
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### Repository method signature changes

All repository methods that participate in transactions gain an optional `session` parameter:

```typescript
// Before
async findById(id: string): Promise<User | null>

// After
async findById(id: string, session?: ClientSession): Promise<User | null>
```

Methods affected: `findById`, `findByEmail`, `findByResetToken`, `findByEmailVerificationToken`, `findByPendingEmailToken`, `existsByEmailExcludingSelf`, `existsByNameExcludingSelf`, `update`, `createWithRole`.

### `runInTransaction` helper pattern

```typescript
// Private method in AuthService / UserService
private async runInTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await this.connection.startSession();
  try {
    return await this.connection.withTransaction(() => callback(session));
  } catch (error) {
    // MongoDB auto-aborts on throw; re-throw for caller
    throw error;
  } finally {
    await session.endSession();
  }
}
```

### Password field schema change

```typescript
// Before
@Prop({ required: true })
password: string;

// After
@Prop({ required: true, select: false })
password: string;
```

### Graceful degradation

```typescript
// If startSession() throws (standalone MongoDB), fall back:
async runInTransactionOrFallback<T>(
  operation: string,
  callback: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  try {
    return await this.runInTransaction(callback);
  } catch (err) {
    if (err.message?.includes('Transaction numbers') || err.message?.includes('replica set')) {
      this.logger.warn(`Transactions not available (${operation}), running without session`);
      return callback();
    }
    throw err;
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `runInTransaction` calls `startSession`, `withTransaction`, `endSession` | Mock `Connection`, verify call order |
| Unit | `runInTransaction` re-throws on error | Mock `withTransaction` to throw, assert error propagates |
| Unit | `escapeRegExp` escapes all special regex chars | Jest parameterized tests |
| Unit | AuthService methods emit events OUTSIDE transaction | Verify event emitter called after transaction resolves |
| Unit | Graceful fallback when `startSession` throws | Mock `startSession` to reject, assert fallback path |
| Integration | Transaction rolls back on duplicate email in register | MongoMemoryServer with `replSet: 'rs0'`, attempt duplicate, assert no user created |
| Integration | updateUser TOCTOU: concurrent email change | Two parallel requests, one should fail with conflict |
| Integration | Password not returned in any query result | Register user, call findAll/findById, assert no password field |
| E2E | Full register → verify → login → resetPassword flow | `createTestApp` with replSet MongoMemoryServer |
| E2E | Graceful degradation: standalone MongoDB | Run e2e without replSet config, assert operations still succeed |

### MongoMemoryServer replSet config

```typescript
// test/helpers/index.ts
export const createConnectionWithReplSet = async () => {
  const mongod = await MongoMemoryServer.create({
    instance: { args: ['--replSet', 'rs0'] },
  });
  // Trigger replica set initialization
  await mongod.waitUntilRunning();
  const uri = mongod.getUri();
  const mongoConnection = mongoose.createConnection(uri);
  return { mongod, mongoConnection };
};
```

## Migration / Rollout

No migration required. This is a code-only change:
- Existing data is unaffected (transactions only apply to new writes)
- `select: false` on password is backward-compatible (existing queries that don't need password keep working; login query needs `.select('+password')` added)
- Graceful degradation means dev environments without replSet continue working
- Feature flag not needed — transaction support is detected at runtime

## Open Questions

- [ ] Should `login` flow also be transactional? (read → validate → update failed attempts) — currently not multi-write, but lockout state update could race. Low priority.
- [ ] Should `requestEmailChange` in UserService be transactional? (read → check existing → update) — yes, but lower priority than the 5 core flows.
