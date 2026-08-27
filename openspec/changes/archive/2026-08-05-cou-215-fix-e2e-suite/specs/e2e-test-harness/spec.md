# e2e-test-harness Specification

## Purpose

Documents the bootstrap contract required for a green `make test:e2e`: Fastify adapter, admin seed, rate-limit thresholds, and DB prerequisites.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| ETH-01 | Fastify adapter for all e2e specs | Every e2e spec MUST use `createTestApp()` (Fastify adapter). Express-default `createNestApplication()` is NOT permitted. |
| ETH-02 | Admin seed helper | A seed helper MUST provide an admin-authenticated user for authorization tests. |
| ETH-03 | Elevated rate limits for test env | The e2e environment MUST use elevated rate-limit thresholds that do not throttle parallel test suites. |
| ETH-04 | DB prerequisites — roles and permissions | Roles and permissions collections MUST be populated before any e2e spec runs. |

## Scenarios

### ETH-S01: e2e spec uses Fastify adapter via createTestApp()

**Given** a new or existing e2e spec file at `test/e2e/**/*.e2e-spec.ts`
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

## Test Infrastructure

| Component | File | Responsibility |
|-----------|------|----------------|
| Fastify bootstrap | `test/helpers/create-test-app.ts` | Returns NestJS app with Fastify adapter |
| Admin seed | `test/helpers/seed-admin.ts` | Idempotent admin user creation |
| Global setup | `test/jest.setup.ts` | Rate-limit env vars, DB seed orchestration |
| Makefile target | `Makefile` (`test:e2e`) | Runs full e2e suite with prerequisites |
