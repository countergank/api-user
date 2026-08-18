# e2e-test-harness Specification

## Purpose

Documents the bootstrap contract required for a green `make test:e2e`: Fastify adapter, admin seed, rate-limit thresholds, and DB prerequisites.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| ETH-01 | Fastify adapter for all e2e specs | Every e2e spec MUST use `createTestApp()` (Fastify adapter). Express-default `createNestApplication()` is NOT permitted. (Previously: specs could sit at `test/` top level.) |
| ETH-02 | Admin seed helper | A seed helper MUST provide an admin-authenticated user for authorization tests. |
| ETH-03 | Elevated rate limits for test env | The e2e environment MUST use elevated rate-limit thresholds that do not throttle parallel test suites. |
| ETH-04 | DB prerequisites — roles and permissions | Roles and permissions collections MUST be populated before any e2e spec runs. |
| ETH-08 | E2E spec directory layout | All e2e specs MUST reside at `test/e2e/{domain}/*.e2e-spec.ts`, one folder per domain (auth, user, audit-logs, rbac, password-strength; i18n stays; `GET /` smoke spec moves to `app`). Collection MUST stay config-driven via `test/jest-e2e.json` (`testRegex: ".e2e-spec.ts$"`), so moves MUST NOT change which specs run. No duplicate domain folders SHALL exist (no `test/user/` alongside `test/e2e/user/`). |
| ETH-09 | httpyac removed | `test/httpyac/` MUST be deleted. No `httpyac` reference SHALL remain in package.json, scripts, Makefile, CI, or docs. |
| ETH-10 | Dead/orphaned test files removed | Root `jest.e2e.config.js`, `test/helpers/index.ts`, `test/helpers/seed-admin.spec.ts`, and `test/i18n/i18n.service.spec.ts` MUST be deleted. Deletions MUST NOT break the build or any jest run. |
| ETH-11 | Bounded poll helper for audit-log assertions | Audit-logs e2e specs MUST NOT use fixed `setTimeout` sleeps before asserting async audit persistence; they MUST use `test/helpers/audit-poll.ts`, polling until the condition holds (5s max, ~100ms interval), failing with diagnostics on timeout. |
| ETH-12 | Single canonical /users/profile e2e spec | `GET /users/profile` e2e assertions SHALL exist only in `test/e2e/user/user-profile.e2e-spec.ts`; `auth.e2e-spec.ts` MUST NOT duplicate them, and profile coverage MUST NOT be reduced. |
| ETH-13 | Unit and e2e suites green | After the refactor, `npm run test:unit` MUST pass 717 tests with 0 failures and `npm run test:e2e` MUST pass with 0 failures (70 before, 68 after dedupe), including the 2 previously flaky audit-logs tests. |

## Scenarios

### ETH-S01: e2e spec uses Fastify adapter via createTestApp()

**Given** an e2e spec file at `test/e2e/{domain}/*.e2e-spec.ts`
**When** the spec initializes the NestJS application
**Then** it MUST import and call `createTestApp()` from `test/helpers/create-test-app.ts`
**And** it MUST NOT call `moduleFixture.createNestApplication()` (Express default)
**And** the `AuditInterceptor` MUST NOT crash on `response.raw.on('finish')`

### ETH-S02: createTestApp() returns a Fastify-based NestJS app

**Given** `createTestApp()` is called with a valid NestJS module
**When** the returned app instance is inspected
**Then** the underlying HTTP adapter MUST be `FastifyAdapter`
**And** the app MUST be ready to receive HTTP requests after `await app.init()`

### ETH-S03: Admin seed helper creates an admin user

**Given** the database is connected and the `users` collection is accessible
**When** `seedAdminForE2E()` is called from a spec's `beforeAll` block
**Then** a user with the ADMIN role MUST exist in the database
**And** the helper MUST return credentials (email, password, or token) usable for authenticated requests
**And** calling the helper again MUST be idempotent (no duplicate users created)

### ETH-S04: Admin-seeded credentials authorize admin-only endpoints

**Given** `seedAdminForE2E()` has been called and returned credentials
**When** an e2e test sends a request to an admin-only endpoint with those credentials
**Then** the server MUST respond with HTTP 200 or 201 (not 401 or 403)
**And** the request MUST pass the RBAC guard for ADMIN role

### ETH-S05: Test env rate limits do not throttle parallel suites

**Given** `test/jest.setup.ts` sets the following env vars:
  - `LOGIN_THROTTLE_LIMIT` = 20
  - `REGISTER_THROTTLE_LIMIT` = 30
  - `THROTTLE_LIMIT` = 30
  - `FORGOT_PASSWORD_THROTTLE_LIMIT` = 15
  - All TTL values remain at 60s
**When** 38 e2e specs run in parallel via `make test:e2e`
**Then** no spec MUST receive HTTP 429 from rate limiting during normal test execution
**And** production rate limits MUST remain unchanged

### ETH-S06: Roles and permissions are seeded before e2e run

**Given** the `api_user` MongoDB database is running
**When** the e2e test suite starts (via `jest.setup.ts` or global `beforeAll`)
**Then** the `roles` collection MUST contain at least ADMIN, USER, and any other required roles
**And** the `permissions` collection MUST contain all permissions referenced by RBAC guards
**And** if collections are already populated, the seed MUST be idempotent (no duplicates)

### ETH-S07: e2e suite fails if DB prerequisites are missing

**Given** the `roles` collection is empty before e2e execution
**When** a spec that depends on RBAC guards runs
**Then** the suite MUST fail with a clear error indicating missing seed data
**And** the error MUST NOT be a silent 403 or 500 from missing role resolution

### ETH-S08: All e2e specs under test/e2e/{domain}/

**Given** e2e specs at `test/` top level, `test/user/`, and `test/e2e/i18n/`
**When** each spec moves into `test/e2e/{domain}/`
**Then** every `*.e2e-spec.ts` MUST live at `test/e2e/{domain}/`, old paths gone, one folder per domain

### ETH-S09: Collection behavior unchanged

**Given** `testRegex` is `.e2e-spec.ts$`
**When** `npm run test:e2e` runs after the move
**Then** the same 70 `it()` cases are collected

### ETH-S10: No httpyac residue

**Given** `test/httpyac/main/main.http` is a 3-line stub
**When** the directory is deleted and the repo searched
**Then** the directory and every `httpyac` reference MUST be absent

### ETH-S11: Deletions do not break the repo

**Given** the files have no imports, config, or CI references
**When** they are deleted and `npm run build`, `test:unit`, `test:e2e` run
**Then** all succeed with no missing-module or collection errors

### ETH-S12: Poll observes the row within the bound

**Given** an audit row is persisted asynchronously after register/login
**When** `audit-poll.ts` polls the audit-log API at ~100ms intervals
**Then** the assertion proceeds as soon as the row appears

### ETH-S13: Poll timeout fails with diagnostics

**Given** the audit row never appears within 5s
**When** the poll exceeds the 5s bound
**Then** the test MUST fail with diagnostic info (elapsed, attempts, last response)

### ETH-S14: Duplicate profile tests removed from auth

**Given** `auth.e2e-spec.ts` has 2 `GET /users/profile` tests overlapping `user-profile.e2e-spec.ts`
**When** the duplicate tests are removed from auth
**Then** profile coverage (200 with token, 401 without) remains in user-profile only

### ETH-S15: Unit suite green

**Given** deleted specs are outside unit `rootDir` (`src`)
**When** `npm run test:unit` runs
**Then** 717 unit tests pass with 0 failures

### ETH-S16: E2e suite green

**Given** the refactor is complete (moves, deletions, poll helper, dedupe)
**When** `npm run test:e2e` runs locally and on CI
**Then** all collected e2e tests pass with 0 failures (was 68/70)

## Test Infrastructure

| Component | File | Responsibility |
|-----------|------|----------------|
| Fastify bootstrap | `test/helpers/create-test-app.ts` | Returns NestJS app with Fastify adapter |
| Admin seed | `test/helpers/seed-admin.ts` | Idempotent admin user creation |
| Global setup | `test/jest.setup.ts` | Rate-limit env vars, DB seed orchestration |
| Makefile target | `Makefile` (`test:e2e`) | Runs full e2e suite with prerequisites |
