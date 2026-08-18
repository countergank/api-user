# Delta for e2e-test-harness

## ADDED Requirements

### Requirement: ETH-08 — E2E spec directory layout

All e2e specs MUST reside at `test/e2e/{domain}/*.e2e-spec.ts`, one folder per domain (auth, user, audit-logs, rbac, password-strength; i18n stays; `GET /` smoke spec moves to `app`). Collection MUST stay config-driven via `test/jest-e2e.json` (`testRegex: ".e2e-spec.ts$"`), so moves MUST NOT change which specs run. No duplicate domain folders SHALL exist (no `test/user/` alongside `test/e2e/user/`).

#### Scenario: All e2e specs under test/e2e/{domain}/
- GIVEN e2e specs at `test/` top level, `test/user/`, and `test/e2e/i18n/`
- WHEN each spec moves into `test/e2e/{domain}/`
- THEN every `*.e2e-spec.ts` MUST live at `test/e2e/{domain}/`, old paths gone, one folder per domain

#### Scenario: Collection behavior unchanged
- GIVEN `testRegex` is `.e2e-spec.ts$`
- WHEN `npm run test:e2e` runs after the move
- THEN the same 70 `it()` cases are collected

### Requirement: ETH-09 — httpyac removed

`test/httpyac/` MUST be deleted. No `httpyac` reference SHALL remain in package.json, scripts, Makefile, CI, or docs.

#### Scenario: No httpyac residue
- GIVEN `test/httpyac/main/main.http` is a 3-line stub
- WHEN the directory is deleted and the repo searched
- THEN the directory and every `httpyac` reference MUST be absent

### Requirement: ETH-10 — Dead/orphaned test files removed

Root `jest.e2e.config.js`, `test/helpers/index.ts`, `test/helpers/seed-admin.spec.ts`, and `test/i18n/i18n.service.spec.ts` MUST be deleted. Deletions MUST NOT break the build or any jest run.

#### Scenario: Deletions do not break the repo
- GIVEN the files have no imports, config, or CI references
- WHEN they are deleted and `npm run build`, `test:unit`, `test:e2e` run
- THEN all succeed with no missing-module or collection errors

### Requirement: ETH-11 — Bounded poll helper for audit-log assertions

Audit-logs e2e specs MUST NOT use fixed `setTimeout` sleeps before asserting async audit persistence; they MUST use `test/helpers/audit-poll.ts`, polling until the condition holds (5s max, ~100ms interval), failing with diagnostics on timeout.

#### Scenario: Poll observes the row within the bound
- GIVEN an audit row is persisted asynchronously after register/login
- WHEN `audit-poll.ts` polls the audit-log API at ~100ms intervals
- THEN the assertion proceeds as soon as the row appears

#### Scenario: Poll timeout fails with diagnostics
- GIVEN the audit row never appears within 5s
- WHEN the poll exceeds the 5s bound
- THEN the test MUST fail with diagnostic info (elapsed, attempts, last response)

### Requirement: ETH-12 — Single canonical /users/profile e2e spec

`GET /users/profile` e2e assertions SHALL exist only in `test/e2e/user/user-profile.e2e-spec.ts`; `auth.e2e-spec.ts` MUST NOT duplicate them, and profile coverage MUST NOT be reduced.

#### Scenario: Duplicate profile tests removed from auth
- GIVEN `auth.e2e-spec.ts` has 2 `GET /users/profile` tests overlapping `user-profile.e2e-spec.ts`
- WHEN the duplicate tests are removed from auth
- THEN profile coverage (200 with token, 401 without) remains in user-profile only

### Requirement: ETH-13 — Unit and e2e suites green

After the refactor, `npm run test:unit` MUST pass 717 tests with 0 failures and `npm run test:e2e` MUST pass with 0 failures (70 before, 68 after dedupe), including the 2 previously flaky audit-logs tests.

#### Scenario: Unit suite green
- GIVEN deleted specs are outside unit `rootDir` (`src`)
- WHEN `npm run test:unit` runs
- THEN 717 unit tests pass with 0 failures

#### Scenario: E2e suite green
- GIVEN the refactor is complete (moves, deletions, poll helper, dedupe)
- WHEN `npm run test:e2e` runs locally and on CI
- THEN all collected e2e tests pass with 0 failures (was 68/70)

## MODIFIED Requirements

### Requirement: ETH-01 — Fastify adapter for all e2e specs

Every e2e spec MUST use `createTestApp()` (Fastify adapter). Express-default `createNestApplication()` is NOT permitted.
(Previously: specs could sit at `test/` top level.)

#### Scenario: ETH-S01 — e2e spec uses Fastify adapter via createTestApp()

**Given** an e2e spec file at `test/e2e/{domain}/*.e2e-spec.ts`
**When** the spec initializes the NestJS application
**Then** it MUST import and call `createTestApp()` from `test/helpers/create-test-app.ts`
**And** it MUST NOT call `moduleFixture.createNestApplication()` (Express default)
**And** the `AuditInterceptor` MUST NOT crash on `response.raw.on('finish')`

## REMOVED Requirements

None.

## RENAMED Requirements

None.
