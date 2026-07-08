# Exploration: MongoDB Transactions & Data Integrity

## Current State

The codebase uses **Mongoose 8.5** with **MongoDB 6.0.3** (standalone, NOT a replica set). There are **zero** uses of `startSession()`, `withTransaction()`, or any session-based operations in the entire codebase. Multi-step writes execute as independent operations with no atomicity guarantees.

### MongoDB Setup — Transactions NOT Supported

`docker-compose.yml` (line 3): `image: mongo:6.0.3` — standalone container with no `--replSet` flag. **MongoDB transactions require a replica set.** The current setup CANNOT support transactions without adding `--replSet rs0` to the MongoDB command and running `rs.initiate()`.

`src/config/custom-module-options/mongoose-module-option.ts` (line 15): Connection URI includes `authSource=admin` but no `replicaSet` parameter.

---

## Multi-Step Write Operations Identified

### 1. `auth.service.ts:register()` — Lines 46-87 (CRITICAL)
**Steps:**
1. `userService.createWithRole()` — creates user document (line 59)
2. `userService.update()` — sets verification token + expiry (line 73-76)
3. `eventEmitter.emit()` — fires email event (line 78) — async, fire-and-forget

**Risk:** If step 2 fails, user exists without verification token. User is created but cannot be verified. **Orphaned user.**

### 2. `auth.service.ts:login()` — Lines 89-131 (MEDIUM)
**Steps:**
1. `userService.findByEmail()` — reads user (line 90)
2. `userService.update()` — increments failed attempts or locks account (line 114)
3. OR `userService.update()` — resets failed attempts on success (line 120-123)

**Risk:** Race condition if concurrent login attempts. Two requests could read the same `failedLoginAttempts` value and both increment to the same value instead of sequential increments.

### 3. `auth.service.ts:forgotPassword()` — Lines 142-163 (MEDIUM)
**Steps:**
1. `userService.findByEmail()` — reads user (line 143)
2. `userService.update()` — sets reset token + expiry (line 151-154)
3. `eventEmitter.emit()` — fires email event (line 156)

**Risk:** If update fails after token is generated, token is wasted (minor). If email fails, user has a valid reset token but never receives it.

### 4. `auth.service.ts:resetPassword()` — Lines 170-191 (HIGH)
**Steps:**
1. `userService.findByResetToken()` — finds user by token (line 171)
2. `userService.hashPassword()` — hashes new password (line 177)
3. `userService.update()` — sets new password + clears token (line 179-183)
4. `eventEmitter.emit()` — fires email event (line 185)

**Risk:** If step 3 fails, reset token remains valid and can be reused (replay attack). Token should be invalidated BEFORE password change or in same atomic operation.

### 5. `auth.service.ts:verifyEmail()` — Lines 198-209 (MEDIUM)
**Steps:**
1. `userService.findByEmailVerificationToken()` — finds user (line 199)
2. `userService.update()` — sets `isActive: true`, clears token (line 204-208)

**Risk:** If update fails, verification token remains valid and can be reused.

### 6. `auth.service.ts:confirmEmailChange()` — Lines 216-240 (HIGH)
**Steps:**
1. `userService.findByPendingEmailToken()` — finds user (line 217)
2. `userService.update()` — applies new email, clears pending fields (line 227-232)
3. `eventEmitter.emit()` — fires confirmation email (line 234)

**Risk:** If step 2 partially fails, user could have new email but stale pending fields, or vice versa.

### 7. `user.service.ts:create()` — Lines 36-52 (MEDIUM)
**Steps:**
1. `existsByName()` + `existsByEmail()` — parallel checks (line 37-38)
2. `userRepository.create()` — creates user (line 50)

**Risk:** TOCTOU race — two concurrent requests could both pass the existence check and attempt to create. MongoDB unique indexes will catch this, but the error handling is via exception, not transaction rollback.

### 8. `user.service.ts:createWithRole()` — Lines 54-77 (MEDIUM)
Same TOCTOU pattern as `create()`.

### 9. `user.service.ts:updateUser()` — Lines 179-205 (MEDIUM)
**Steps:**
1. `findById()` — reads user (line 180)
2. `existsByEmailExcludingSelf()` — checks email conflict (line 186)
3. `existsByNameExcludingSelf()` — checks name conflict (line 193)
4. `userRepository.update()` — applies update (line 204)

**Risk:** TOCTOU — another request could claim the email/username between the check and the update.

### 10. `user.service.ts:requestEmailChange()` — Lines 134-151 (MEDIUM)
**Steps:**
1. `findByEmail()` — checks if new email exists (line 135)
2. `findById()` — reads user (line 140)
3. `update()` — sets pending email fields (line 144-148)

**Risk:** TOCTOU on email check.

### 11. `email.service.ts:sendBySlug()` — Lines 37-62 (LOW)
**Steps:**
1. `logRepository.create()` — creates pending log (line 46-52)
2. `eventEmitter.emit('email.send')` — async send (line 54)
3. `logRepository.update()` — updates status to sent/failed (line 101-105, in `processSend`)

**Risk:** Log entry created but email send fails — log shows "pending" forever. This is by design (fire-and-forget), but inconsistent state.

### 12. `rbac/services/role.service.ts:updatePermissions()` — Line 85-87 (LOW)
Single `findByIdAndUpdate` — atomic by nature. **No transaction needed.**

### 13. Seed operations (permission.service.ts:68, role.service.ts:94, email-template.service.ts:149-164)
`insertMany` is atomic per call. **Acceptable as-is.**

---

## NoSQL Injection Vectors

### 1. `user.repository.ts:164` — **CONFIRMED**
```typescript
const searchRegex = new RegExp(filters.search, 'i');
```
**Risk:** If `filters.search` contains regex special chars (`.*+?^${}()|[]\`), the regex behavior changes. Malicious input like `.*` matches everything. `a(b` throws a `SyntaxError`.

**Fix:** Escape regex special characters before constructing RegExp:
```typescript
const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchRegex = new RegExp(escaped, 'i');
```

### 2. No other `new RegExp()` found in codebase. **Only one vector confirmed.**

### 3. Other query patterns reviewed:
- `findOne({ email })`, `findOne({ name })` — safe, exact match
- `find({ _id: { $ne: excludeId } })` — safe
- `find({ name: { $in: names } })` — safe, exact match array
- No `$where`, `$expr`, or `eval` usage found

---

## Queries Fetching Password Unnecessarily

### 1. `user.repository.ts:122` — `findAll()`
```typescript
return this.userModel.find().exec();
```
**Issue:** Returns ALL fields including `password`. No `.select('-password')`.

### 2. `user.repository.ts:87` — `findById()`
```typescript
return this.userModel.findById(id).exec();
```
**Issue:** Returns password. Called by `auth.service.ts:validateUser()` (line 134) which doesn't need password. Also called by `user.service.ts:findById()` (line 84) which is used by many endpoints.

### 3. `user.repository.ts:91` — `findByEmail()`
```typescript
return this.userModel.findOne({ email }).exec();
```
**Issue:** Returns password. This IS needed for login validation (`auth.service.ts:100`), so it's justified here. But the same method is used by `user.service.ts:findByEmail()` which is called from `requestEmailChange()` (line 135) where password is NOT needed.

### 4. `user.repository.ts:184-190` — `findPaginated()`
```typescript
this.userModel.find(mongoFilter).sort(...).skip(...).limit(...).exec()
```
**Issue:** Returns password in paginated list. The DTO (`UserDTO.of(user)`) uses `@Exclude()` on password, but the data is still fetched from DB and transferred to application memory.

### 5. `user.repository.ts:95-100` — `findByResetToken()`
Returns password. Justified — the reset flow needs to update the password.

### 6. `user.repository.ts:103-109` — `findByEmailVerificationToken()`
Returns password. **Not needed** — only sets `isActive: true` and clears token.

### 7. `user.repository.ts:112-118` — `findByPendingEmailToken()`
Returns password. **Not needed** — only reads `pendingEmail` field.

### Summary Table

| Method | File:Line | Needs Password? | Fix |
|--------|-----------|-----------------|-----|
| `findAll()` | user.repository.ts:122 | No | `.select('-password')` |
| `findById()` | user.repository.ts:87 | Sometimes | Add `includePassword` option or separate method |
| `findByEmail()` | user.repository.ts:91 | Sometimes | Add `includePassword` option or separate method |
| `findPaginated()` | user.repository.ts:184 | No | `.select('-password')` |
| `findByResetToken()` | user.repository.ts:95 | Yes | Keep as-is |
| `findByEmailVerificationToken()` | user.repository.ts:103 | No | `.select('-password')` |
| `findByPendingEmailToken()` | user.repository.ts:112 | No | `.select('-password')` |

---

## Existing Atomic Patterns

The codebase already uses some atomic operations:
- `findByIdAndUpdate()` — atomic single-document update (user.repository.ts:135, 199; role.service.ts:86; email-log.repository.ts:30)
- `findOneAndUpdate()` — atomic (email-template.repository.ts:36)
- `insertMany()` — atomic bulk insert (permission.service.ts:59; role.service.ts:94)
- `exists()` — atomic read (multiple locations)

**No multi-document transactions exist.** All atomic operations are single-document.

---

## Technical Approach Options

### Workstream A: Enable MongoDB Transactions

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **A1: Add replica set to docker-compose** | Enables real transactions; production-ready | Requires `--replSet rs0` + `rs.initiate()`; slightly slower startup; `mongodb-memory-server` in tests needs replica set config too | Medium |
| **A2: Keep standalone, use compensating actions** | No infra change; simpler | Not true atomicity; rollback logic needed per operation; error-prone | Low |
| **A3: Single-document atomic updates only** | No infra change; uses `$set` with conditions | Limited to single document; can't span user+audit collections | Low |

**Recommendation: A1** — Transactions are the right solution. Docker-compose replica set is straightforward:
```yaml
command: ["mongod", "--replSet", "rs0", "--bind_ip_all"]
```
Plus an init script or one-time `rs.initiate()` call. Tests need `MongoMemoryServer` with `replSet` config.

### Workstream B: Fix NoSQL Injection

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **B1: Escape regex special chars** | Simple, targeted fix | Only fixes RegExp vector | Low |
| **B2: Replace RegExp with text search** | More secure; uses MongoDB $text | Requires text index; different search semantics | Medium |
| **B3: Input validation + escape** | Defense in depth | More code to maintain | Low |

**Recommendation: B1 + B3** — Escape regex chars AND add input validation (max length, allowed chars).

### Workstream C: Remove Password from Queries

| Approach | Pros | Cons | Effort |
|----------|------|------|--------|
| **C1: Add `.select('-password')` to each query** | Simple, explicit | Need to audit each call site for whether password is needed | Low |
| **C2: Schema-level default exclude** | One change; applies everywhere | Mongoose doesn't support default exclude on `@Prop` | N/A |
| **C3: Separate `findWithPassword()` and `findWithoutPassword()` methods** | Clear intent; explicit API | More methods to maintain | Medium |

**Recommendation: C1** — Add `.select('-password')` to queries that don't need it. For `findById()` and `findByEmail()`, add an optional `includePassword` parameter.

---

## Risks and Constraints

1. **Docker MongoDB is standalone** — Transactions require replica set. This is a HARD dependency.
2. **`mongodb-memory-server` for tests** — Must be configured with `replSet` to test transactions. Current test setup (`create-test-app.ts`) uses the real `AppModule` which connects to the real MongoDB via docker-compose.
3. **Email events are fire-and-forget** — Even with transactions, email sending is async via EventEmitter. Transactions can cover DB writes but NOT external API calls (Resend/SMTP).
4. **Audit logging is async** — `AuditListener` writes to DB via event emission. Cannot be in the same transaction as the business operation.
5. **`nestjs-cls` for correlation IDs** — Already in place. Can be leveraged for transaction context.
6. **Mongoose 8.5 supports transactions** — API: `const session = await mongoose.startSession(); await session.withTransaction(async () => { ... });`
7. **Regression risk is HIGH** — Touches auth flow, user CRUD, and all multi-step operations. Every change needs test coverage.
8. **`as any` casts** — Multiple places use `as any` for updates (auth.service.ts:76, 183, 208, 232, 254). These should be cleaned up as part of this work.

---

## Recommended Approach

### Phase 1: Infrastructure (Prerequisite)
1. Update `docker-compose.yml` to run MongoDB as replica set (`--replSet rs0`)
2. Add init script or health check that runs `rs.initiate()`
3. Update `mongoose-module-option.ts` to include `replicaSet: 'rs0'` in connection options
4. Configure `mongodb-memory-server` with `replSet` for e2e tests

### Phase 2: NoSQL Injection Fix (Quick Win)
1. Escape regex special chars in `user.repository.ts:164`
2. Add input validation for search parameter

### Phase 3: Password Field Exclusion (Quick Win)
1. Add `.select('-password')` to `findAll()`, `findPaginated()`, `findByEmailVerificationToken()`, `findByPendingEmailToken()`
2. Add optional `includePassword` parameter to `findById()` and `findByEmail()`

### Phase 4: Transaction Implementation (Core Work)
Wrap these operations in `session.withTransaction()`:
- `auth.service.ts:register()` — create user + set verification token
- `auth.service.ts:resetPassword()` — update password + clear token
- `auth.service.ts:verifyEmail()` — activate user + clear token
- `auth.service.ts:confirmEmailChange()` — apply email + clear pending fields
- `user.service.ts:updateUser()` — check conflicts + update (TOCTOU protection)

**Note:** Email emission stays outside the transaction (fire-and-forget). Audit logging stays async via events.

### Phase 5: Cleanup
1. Remove `as any` casts with proper typing
2. Add transaction-aware e2e tests
3. Document transaction patterns for future use

---

## Files to Modify

| File | Change |
|------|--------|
| `docker-compose.yml` | Add `--replSet rs0` to MongoDB command |
| `src/config/custom-module-options/mongoose-module-option.ts` | Add `replicaSet` option |
| `src/user/repository/user.repository.ts` | Escape RegExp, add `.select('-password')`, add session support |
| `src/user/service/user.service.ts` | Add transaction wrappers |
| `src/auth/auth.service.ts` | Add transaction wrappers for register, resetPassword, verifyEmail, confirmEmailChange |
| `test/helpers/create-test-app.ts` | Configure MongoDB memory server with replSet (if needed) |
| `test/auth.e2e-spec.ts` | Add transaction-aware tests |
| `src/common/audit/audit-log.repository.ts` | Add session-aware create (optional) |

## Files to Create

| File | Purpose |
|------|---------|
| `src/common/database/database.service.ts` | Transaction helper / session management |
| `docker/init-replica-set.js` | MongoDB replica set initialization script |

---

## Ready for Proposal

**Yes.** The exploration is complete. The orchestrator should tell the user:

- **4 workstreams identified**: Infrastructure (replica set), NoSQL injection fix, password field exclusion, and transaction implementation
- **13 multi-step operations** identified, with 5 requiring transaction wrapping (register, resetPassword, verifyEmail, confirmEmailChange, updateUser)
- **1 confirmed NoSQL injection vector** in search regex
- **7 queries** fetching password unnecessarily
- **Highest risk**: Auth flow changes — every transaction wrapper needs careful error handling and rollback logic
- **Prerequisite**: MongoDB must be converted to replica set before any transaction work can begin

skill_resolution: paths-injected
