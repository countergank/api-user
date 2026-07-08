# Transactions Specification

## Purpose

Multi-step write operations MUST execute within MongoDB client sessions with causal consistency. If any step fails, all writes MUST roll back. MongoDB MUST run as a replica set in all environments to support transactions.

## Requirements

| ID | Requirement | Keywords |
|----|-------------|----------|
| TX-01 | Replica set in docker-compose | MUST |
| TX-02 | Replica set in test environment | MUST |
| TX-03 | register() transactional | MUST |
| TX-04 | resetPassword() transactional | MUST |
| TX-05 | verifyEmail() transactional | MUST |
| TX-06 | confirmEmailChange() transactional | MUST |
| TX-07 | updateUser() transactional (TOCTOU) | MUST |
| TX-08 | Graceful degradation without sessions | MUST |

### Requirement: TX-01 — Replica Set in Docker-Compose

The MongoDB service in `docker-compose.yml` MUST be configured as a single-node replica set. The service command MUST include `--replSet rs0`. A health check or init script MUST ensure `rs.initiate()` completes before the application connects.

#### Scenario: Docker MongoDB starts as replica set
- **GIVEN** `docker-compose.yml` defines MongoDB with `--replSet rs0`
- **WHEN** `docker compose up` completes
- **THEN** `rs.status()` returns `ok: 1`
- **AND** the replica set name is `rs0`

#### Scenario: Application connects with replicaSet option
- **GIVEN** `mongoose-module-option.ts` includes `replicaSet: 'rs0'`
- **WHEN** the application starts
- **THEN** Mongoose connects successfully and sessions are available

### Requirement: TX-02 — Replica Set in Test Environment

`MongoMemoryServer` MUST be configured with `replSet` arguments so integration tests support transactions. All test helper files that create `MongoMemoryServer` instances MUST include `{ instance: { args: ['--replSet', 'rs0'] } }`.

#### Scenario: Integration tests support transactions
- **GIVEN** `test/helpers/index.ts` creates `MongoMemoryServer` with replSet args
- **WHEN** an integration test calls `mongoose.startSession()`
- **THEN** the session is created without error
- **AND** `session.withTransaction()` executes successfully

#### Scenario: All test files use replSet config
- **GIVEN** the test suite has multiple files creating `MongoMemoryServer`
- **WHEN** `npm test` runs
- **THEN** all instances use the same `--replSet rs0` configuration

### Requirement: TX-03 — register() Transactional

`AuthService.register()` MUST wrap user creation and verification token assignment in a single MongoDB transaction. If either operation fails, both MUST roll back. Email events remain fire-and-forget (outside the transaction).

#### Scenario: Happy path — user created with verification token
- **GIVEN** a valid registration request with unique email and username
- **WHEN** `register()` executes successfully
- **THEN** the user document exists with the verification token set
- **AND** both writes committed in a single transaction

#### Scenario: Token update fails — user creation rolls back
- **GIVEN** a valid registration request
- **WHEN** the verification token update throws after user creation succeeds
- **THEN** the user document MUST NOT exist in the database
- **AND** the transaction aborts all writes

#### Scenario: User creation fails — no partial state
- **GIVEN** a registration request with a duplicate email
- **WHEN** `register()` detects the conflict
- **THEN** no user document is created
- **AND** no verification token is set
- **AND** a `BadRequestException` is thrown

### Requirement: TX-04 — resetPassword() Transactional

`AuthService.resetPassword()` MUST wrap password update and reset token clearing in a single transaction. Both operations MUST succeed or both MUST roll back.

#### Scenario: Happy path — password updated, token cleared
- **GIVEN** a valid reset token for an existing user
- **WHEN** `resetPassword()` executes successfully
- **THEN** the user's password is updated
- **AND** `resetPasswordToken` and `resetPasswordExpires` are cleared
- **AND** both changes committed atomically

#### Scenario: Password update fails — token not cleared
- **GIVEN** a valid reset token
- **WHEN** the password update throws
- **THEN** `resetPasswordToken` and `resetPasswordExpires` remain unchanged
- **AND** the user can retry with the same token

### Requirement: TX-05 — verifyEmail() Transactional

`AuthService.verifyEmail()` MUST wrap user activation and verification token clearing in a single transaction.

#### Scenario: Happy path — user activated, token cleared
- **GIVEN** a valid verification token for an inactive user
- **WHEN** `verifyEmail()` executes successfully
- **THEN** `isActive` is set to `true`
- **AND** `emailVerificationToken` and `emailVerificationExpires` are cleared
- **AND** both changes are atomic

#### Scenario: Activation fails — token preserved
- **GIVEN** a valid verification token
- **WHEN** the activation update throws
- **THEN** the verification token and expiry remain unchanged
- **AND** the user can retry verification

### Requirement: TX-06 — confirmEmailChange() Transactional

`AuthService.confirmEmailChange()` MUST wrap email update and pending token clearing in a single transaction.

#### Scenario: Happy path — email changed, pending token cleared
- **GIVEN** a valid pending email token with `pendingEmail` set
- **WHEN** `confirmEmailChange()` executes successfully
- **THEN** the user's `email` is updated to the pending value
- **AND** `pendingEmail`, `pendingEmailToken`, `pendingEmailExpires` are cleared
- **AND** both changes are atomic

#### Scenario: Email update fails — pending state preserved
- **GIVEN** a valid pending email token
- **WHEN** the email update throws
- **THEN** `pendingEmail` and related token fields remain unchanged
- **AND** the user can retry the confirmation

### Requirement: TX-07 — updateUser() TOCTOU Prevention

`UserService.updateUser()` MUST wrap the uniqueness check and the update operation in a single transaction to prevent time-of-check-time-of-use race conditions.

#### Scenario: Happy path — uniqueness check and update atomic
- **GIVEN** a valid update request with a new email not taken by another user
- **WHEN** `updateUser()` executes
- **THEN** the uniqueness check and the update occur within the same session
- **AND** the user's email is updated

#### Scenario: Concurrent update — race condition prevented
- **GIVEN** User A and User B attempt to update to the same email concurrently
- **WHEN** both `updateUser()` calls execute within overlapping transactions
- **THEN** only one transaction commits successfully
- **AND** the other transaction detects the conflict and throws `UserEmailAlreadyExistsError`

#### Scenario: Username uniqueness in transaction
- **GIVEN** a valid update request with a new userName
- **WHEN** `updateUser()` executes
- **THEN** the name uniqueness check and update occur atomically

### Requirement: TX-08 — Graceful Degradation Without Sessions

Transaction-dependent operations MUST detect when MongoDB sessions are unavailable (e.g., standalone MongoDB without replica set) and fall back to non-transactional execution. The system MUST NOT crash or refuse connections in standalone mode.

#### Scenario: Replica set available — transactions used
- **GIVEN** MongoDB is running as a replica set
- **WHEN** `register()` is called
- **THEN** the operation executes within a `session.withTransaction()` block

#### Scenario: Standalone MongoDB — fallback to non-transactional
- **GIVEN** MongoDB is running as standalone (no replica set)
- **WHEN** `register()` is called
- **THEN** the operation executes without a session
- **AND** the user is created and token is set (non-atomically)
- **AND** no error is thrown due to missing session support

#### Scenario: Transaction abort — error propagated
- **GIVEN** a transaction is in progress
- **WHEN** `session.withTransaction()` throws an error
- **THEN** the error is propagated to the caller
- **AND** all writes within the transaction are rolled back
