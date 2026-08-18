# Tasks: COU-223 — Refactor test directory & remove httpyac

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~190 authored (~1,000 lines moved via git mv renames) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units (single PR, one commit per unit)

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| U1 | Delete httpyac + 4 dead files; update TX-02 ref | PR 1 | `npm run build && npm run test:unit` | N/A (dead files, zero refs verified) | git revert commit restores files |
| U2 | git mv 7 specs into `test/e2e/{domain}/` | PR 1 | `npm run test:e2e -- --runInBand` | e2e suite with docker-compose Mongo/Redis up | revert the moves |
| U3 | audit-poll helper + jest-helper config + unit test | PR 1 | `npm run test:helpers` | N/A (fake-timer unit test) | delete helper + config |
| U4 | Replace 2 setTimeout sleeps; drop 2 dup profile tests | PR 1 | `npm run test:e2e -- --runInBand` | e2e suite, real Mongo/Redis | revert helper usage; restore dup tests |

## Phase 1: Cleanup — Deletions (ETH-09, ETH-10)

- [x] T1.1 `git rm -r test/httpyac/` (3-line `main/main.http` stub)
- [ ] T1.2 `git rm` root `jest.e2e.config.js`, `test/helpers/index.ts`, `test/helpers/seed-admin.spec.ts`, `test/i18n/i18n.service.spec.ts` — **PARTIAL: 3 of 4 deleted. `test/helpers/index.ts` retained: 12 src unit specs import `Mock`/`createConnection`/`clearMongo*` from it (design's "zero imports" premise was false); deleting it breaks ETH-13. See apply-progress.**
- [x] T1.3 Grep repo for `httpyac`, `helpers/index`, `jest.e2e.config.js` → no references left in code/config/CI/docs (only the change's own SDD artifacts and historical archive docs mention them; TX-02 live spec reference updated)

## Phase 2: Directory Moves (ETH-08)

- [x] T2.1 `git mv` per design: `test/{app,auth,audit-logs,rbac,password-strength}.e2e-spec.ts` → `test/e2e/{same}/`; `test/user-profile.e2e-spec.ts` → `test/e2e/user/`; `test/user/admin-crud-pagination.e2e-spec.ts` → `test/e2e/user/` (relative import paths adjusted for helpers/src so the suite still compiles)
- [x] T2.2 Verify every `*.e2e-spec.ts` lives under `test/e2e/{domain}/`, no duplicate domain folders, `test/e2e/i18n/` untouched (8 files, 70 `it()` collected; empty `test/user/` and `test/i18n/` dirs removed)

## Phase 3: audit-poll Helper (ETH-11)

- [x] T3.1 Create `test/helpers/audit-poll.ts`: `waitForAuditRow` (5s max, ~100ms interval, diagnostics on timeout) + `waitForAuditLogEntry` (polls `/admin/audit-logs`) per design interface
- [x] T3.2 Create `test/jest-helper.json` (rootDir `.`, testRegex `helpers/.*\.spec\.ts$`) + npm script `test:helpers` (helper specs live outside unit rootDir `src`)

## Phase 4: Helper Unit Test

- [x] T4.1 Create `test/helpers/audit-poll.spec.ts` with fake timers: success path returns value; timeout path throws diagnostics (elapsed/attempts/lastObserved); interval respected
- [x] T4.2 `npm run test:helpers` green (8/8); unit count stays 717 (spec outside `src` rootDir)

## Phase 5: Core Refactor

- [x] T5.1 In `test/e2e/audit-logs/audit-logs.e2e-spec.ts`, replace both `await new Promise(r => setTimeout(r, 500))` (~lines 143, 163) with `await waitForAuditLogEntry(app, adminToken, { action: 'auth.register', resource: 'auth' })`
- [x] T6.1 In `test/e2e/auth/auth.e2e-spec.ts`, delete the 2 duplicate `GET /users/profile` tests (200 with token, 401 without); coverage stays canonical in `test/e2e/user/user-profile.e2e-spec.ts` (removed now-dead `token` plumbing)

## Phase 6: Documentation

- [x] T7.1 Update `openspec/specs/transactions/spec.md` TX-02 GIVEN (line 40): replace `test/helpers/index.ts` MongoMemoryServer reference with real-MongoDB `test/global-setup.js` wording

## Phase 7: Verification (ETH-13)

- [x] T8.1 `npm run build` → success
- [x] T8.2 `npm run test:unit` → 717 pass, 0 failures
- [ ] T8.3 `npm run test:e2e -- --runInBand` → 68 pass, 0 failures, incl. the 2 formerly flaky audit-logs tests — **BLOCKED (infrastructure): Docker/Mongo/Redis unavailable in this WSL distro; e2e cannot start (`Server selection timed out` at global-setup). CI `test.yml` provides Mongo+Redis; e2e verification must run on CI or a machine with Docker. Local proxies green: 8 files collected, 68 `it()` cases, tsc typecheck clean.**
