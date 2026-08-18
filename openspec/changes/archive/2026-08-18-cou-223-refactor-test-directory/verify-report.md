```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:68a8195c8286726433e07fe435f7426260c9f331edfe879114a6909d12b13f09
verdict: pass
blockers: 0
critical_findings: 0
requirements: 7/7
scenarios: 10/10
test_command: npm run test:unit && npm run test:helpers && npm run test:e2e -- --runInBand
test_exit_code: 0
test_output_hash: sha256:3275c159948e39fdc110dd782ebcf5a1fe2acdad6d5c7528bc45cd7a4ca29b59
build_command: npx tsc -p tsconfig.build.json --outDir /tmp/opencode/verify-cou-223/dist-check --tsBuildInfoFile /tmp/opencode/verify-cou-223/tsbuildinfo.check
build_exit_code: 0
build_output_hash: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

## Verification Report

**Change**: cou-223-refactor-test-directory
**Version**: delta spec e2e-test-harness (ETH-01 modified, ETH-08..ETH-13 added)
**Mode**: Strict TDD
**Branch**: feature/cou-223-refactor-test-directory (8 commits ahead of origin/develop, caa2a69 → 6a0d558)
**Artifact store**: hybrid (Engram + OpenSpec). Verify-report persisted to both.

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 15 |
| Tasks complete | 15 |
| Tasks incomplete | 0 |

T8.3 (e2e 68/68) was BLOCKED in the stale apply-progress (infrastructure); the final-state facts and this independent run confirm it now passes against docker-compose Mongo+Redis (db-user, redis-user up). All tasks including T8.3 verified complete.

### Build & Tests Execution

**Build**: ✅ Compiles clean (declared build command exit 0)
```text
npx tsc -p tsconfig.build.json --outDir /tmp/opencode/verify-cou-223/dist-check --tsBuildInfoFile /tmp/opencode/verify-cou-223/tsbuildinfo.check
→ exit 0, empty output (sha256 e3b0c442…). Full production build graph compiles; src/test-utils correctly excluded from output.
```
⚠️ Plain `npm run build` exits 1 in THIS environment: `EACCES: permission denied, rmdir 'dist/app'` — `dist/` is entirely root-owned (stale Docker build artifact, Aug 18 16:44; same pre-existing issue documented in apply-progress issue #1 since Aug 9). Fails on `deleteOutDir` rmdir BEFORE compiling — not a code error. Workaround documented: rename `dist` → `dist.stale-root-owned/` (apply already did once), cleanup `sudo rm -rf dist.stale-root-owned`. Whole-project typecheck `npx tsc --noEmit -p tsconfig.json --incremental false` → exit 0 (the incremental variant also fails only on writing root-owned `dist/tsconfig.tsbuildinfo`).

**Tests**: ✅ 717 unit + 8 helpers + 68 e2e passed, 0 failed
```text
npm run test:unit                  → 67 suites, 717/717 passed, exit 0
npm run test:helpers               → 1 suite, 8/8 passed, exit 0
npm run test:e2e -- --runInBand    → 8 suites (all 8 domain folders), 68/68 passed, exit 0
```
All 8 e2e suites PASS individually: app, auth, audit-logs (incl. the 2 formerly flaky poll-based tests), i18n, password-strength, rbac, user/admin-crud-pagination, user/user-profile.

**Coverage** (changed file): `test/helpers/audit-poll.ts` → **100% statements/lines/functions, 87.5% branches (7/8)** via `npx jest --config ./test/jest-helper.json --coverage --collectCoverageFrom='helpers/audit-poll.ts'`. Above the 80% threshold.

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| ETH-08 E2E layout | All e2e specs under test/e2e/{domain}/ | Glob: 8 specs under `test/e2e/{app,auth,audit-logs,i18n,password-strength,rbac,user}/`; zero `*.e2e-spec.ts` outside; no duplicate domain folders; no top-level `test/user/`/`test/i18n/` | ✅ COMPLIANT |
| ETH-08 E2E layout | Collection behavior unchanged | `test/jest-e2e.json` testRegex `.e2e-spec.ts$` unchanged; 8 files collected; 70 `it()` pre-dedupe (apply U2), 68 post-dedupe (ETH-12/ETH-13), all collected and passing | ✅ COMPLIANT |
| ETH-09 httpyac removed | No httpyac residue | `test/httpyac/` gone; grep across repo (code/config/CI/docs, excluding change artifacts) → zero hits | ✅ COMPLIANT |
| ETH-10 Dead files removed | Deletions do not break the repo | All 4 files gone (jest.e2e.config.js, test/helpers/index.ts, seed-admin.spec.ts, i18n.service.spec.ts); `test/helpers/` retains exactly audit-poll.ts, audit-poll.spec.ts, create-test-app.ts, seed-admin.ts; build compiles (tsc exit 0), unit 717/717, helpers 8/8, e2e 68/68 | ✅ COMPLIANT |
| ETH-11 Poll helper | Poll observes the row within the bound | `test/e2e/audit-logs/audit-logs.e2e-spec.ts:144,155` use `waitForAuditLogEntry` (no setTimeout residue); register/login audit tests PASS in e2e run; helper unit tests prove polling semantics | ✅ COMPLIANT |
| ETH-11 Poll helper | Poll timeout fails with diagnostics | `audit-poll.spec.ts` timeout test asserts message + `diagnostics{elapsedMs, attempts, lastObserved, timeoutMs}` — passed; helper emits 5s bound / ~100ms interval / diagnostics (audit-poll.ts:28,33,45-49) | ✅ COMPLIANT |
| ETH-12 Single canonical profile spec | Duplicate profile tests removed from auth | `auth.e2e-spec.ts` has zero `/users/profile` references (8 tests: register/login/refresh/forgot-password only); `user-profile.e2e-spec.ts:46-63` canonical — 200 with token (toMatchObject email/name/lastName) + 401 without; both PASS | ✅ COMPLIANT |
| ETH-13 Suites green | Unit suite green | `npm run test:unit` → 717/717, 0 failures (re-run this session) | ✅ COMPLIANT |
| ETH-13 Suites green | E2e suite green | `npm run test:e2e -- --runInBand` → 68/68, 0 failures against docker-compose Mongo+Redis (re-run this session); CI `test.yml` provides `mongo:6.0.3 --replSet rs0` + `redis:7-alpine` and runs unit + e2e | ✅ COMPLIANT |
| ETH-01 Fastify adapter (modified) | e2e spec uses Fastify via createTestApp() | All 8 specs import `createTestApp` from `../../helpers/create-test-app`; zero `createNestApplication()` in test/e2e/; AuditInterceptor finish-crash covered by passing e2e suites | ✅ COMPLIANT |

**Compliance summary**: 10/10 scenarios compliant (runtime-tested).

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| ETH-08 | ✅ Implemented | git-mv layout verified; relative imports re-pointed (../../helpers, ../../../src) per deviation #2 |
| ETH-09 | ✅ Implemented | Directory + all references removed; only the change's own SDD artifacts and historical archive mention it |
| ETH-10 | ✅ Implemented | 4/4 deletions; `src/test-utils/index.ts` migration (355a6ab) + `tsconfig.build.json` excludes `src/test-utils`; absent from build output; zero `test/helpers` refs in src/ and test/ |
| ETH-11 | ✅ Implemented | audit-poll.ts matches design interface (waitForAuditRow + waitForAuditLogEntry); `_app` rename per deviation #3 |
| ETH-12 | ✅ Implemented | Dedupe verified in source |
| ETH-13 | ✅ Implemented | 717+8+68 all green this session |
| ETH-01 | ✅ Implemented | All 8 specs Fastify-based |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| `test/e2e/{domain}/` layout, one folder per domain | ✅ Yes | Exact per design |
| Bounded poll (5s max, ~100ms) with diagnostics over setTimeout | ✅ Yes | audit-poll.ts:28,33,45-49 |
| Dedupe profile to user-profile only | ✅ Yes | Verified in source + runtime |
| Dead-file deletion scope | ✅ Yes | 4/4 + httpyac + TX-02 GIVEN updated (line 40: real MongoDB via global-setup) |
| "All changes are test-only; no application code touched" | ⚠️ Deviation | Commit `6a0d558` modifies `src/auth/auth.controller.ts` (production). Design's own interface contract required `action: 'auth.register'` but controller emitted `REGISTER`/`LOGIN`. Fix aligns controller with the service convention (auth.service.ts:47), existing unit expectations (audit.integration.spec.ts asserts `auth.login`), and the e2e filter/poll assertions. Spec-REQUIRED correction, not scope creep; zero old-name references remain. |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | TDD Cycle Evidence table present in apply-progress (incl. remediation row) |
| All tasks have tests | ✅ | 15/15 — structural tasks (deletions/moves/docs) N/A (no new behavior); behavior tasks T3/T4 backed by audit-poll.spec.ts; T5/T6 by e2e approval tests |
| RED confirmed (tests exist) | ✅ | audit-poll.spec.ts exists with 8 cases; remediation RED documented (TS2307 after index.ts deletion → focused spec failed) |
| GREEN confirmed (tests pass) | ✅ | 8/8 helpers, 717/717 unit, 68/68 e2e — all re-run this session |
| Triangulation adequate | ✅ | 8 distinct cases (success, poll-retry, timeout diagnostics, interval pacing, transient error recovery, persistent error, endpoint success, endpoint retry) — matches claimed "8 cases" |
| Safety Net for modified files | ✅ | 717/717 baseline documented for deletion unit; 70 `it()` baseline for moves/dedupe |

**TDD Compliance**: 6/6 checks passed

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 717 (+8 helper specs) | 67 suites + 1 | jest + ts-jest |
| Integration | 0 (covered by e2e layer) | — | — |
| E2E | 68 | 8 files | jest + supertest (Fastify) |
| **Total** | **793** | **76** | |

### Changed File Coverage

| File | Line % | Branch % | Uncovered | Rating |
|------|--------|----------|-----------|--------|
| `test/helpers/audit-poll.ts` | 100% | 87.5% | branch: lastResponse-when-condition-false path | ✅ Excellent |

Coverage for the remaining changed files (test specs + re-pointed import lines + tsconfig exclusion) is exercised by their own passing suites; no coverage tooling targets test-layer files (informational, not blocking).

### Assertion Quality

| File | Line | Assertion | Issue | Severity |
|------|------|-----------|-------|----------|
| `test/e2e/audit-logs/audit-logs.e2e-spec.ts` | 99-101, 110-112 | `for (entry of response.body.data) expect(entry.action)...` | Ghost-loop risk: assertions never run if `data` empty (pre-existing lines, NOT touched by this change — the change touched import + poll call sites only) | SUGGESTION |

**Assertion quality**: ✅ 0 CRITICAL, 0 WARNING from this change's authored tests. audit-poll.spec.ts (8 cases) and the modified e2e specs assert real behavior with value assertions; the poll-helper calls double as the timeout assertion (throw-on-timeout fails the test). Mock:assertion ratio in audit-poll.spec.ts is healthy (1 mock factory vs ~14 behavioral expects).

### Quality Metrics

**Linter (biome on changed files)**: ⚠️ 8 errors / 7 warnings — classified:
- `test/helpers/audit-poll.ts:48,60` + `audit-poll.spec.ts:5,15,121` — `noExplicitAny` on the design-consistent `Promise<any>`/mock chain (documented in apply-progress as "5 `any` warns remain, design-consistent"). WARNING.
- `src/auth/auth.controller.ts:36,55` — pre-existing `(result: any)` signatures, untouched by the fix (only action strings changed). WARNING (baseline).
- `test/e2e/audit-logs/audit-logs.e2e-spec.ts:39,12` — `noDuplicateTestHooks` + unused `adminUser`, PRE-EXISTING (apply-progress issue #3, CI lints `./src` only). WARNING.
- Remaining items are format/organizeImports style suggestions (SUGGESTION).

**Type Checker**: ✅ `npx tsc --noEmit -p tsconfig.json --incremental false` → exit 0, zero errors (full project incl. tests).

### Issues Found

**CRITICAL**: None

**WARNING**:
1. Design deviation (scope): commit `6a0d558` modifies production code `src/auth/auth.controller.ts` in a change designed as "test-only". Necessary and sufficient to satisfy ETH-11/ETH-13 (controller action names `REGISTER`/`LOGIN` → `auth.register`/`auth.login`, matching service convention, existing unit expectations, and spec), with zero stale references. Restores compliance; does not break any spec. Apply-progress's stale note about action mismatch is superseded.
2. `npm run build` exits 1 in this environment: `dist/` root-owned (stale Docker build artifact, Aug 18 16:44; same pre-existing issue as apply-progress issue #1, Aug 9). Fails at `deleteOutDir` rmdir before compiling. Compile-level build proven clean (declared build command exit 0). Environmental, NOT change-caused. Cleanup: `sudo rm -rf dist` (or rename as before).
3. Pre-existing biome errors in `test/e2e/audit-logs/audit-logs.e2e-spec.ts` (duplicate beforeAll hook, unused `adminUser`) remain in a file this change modified — documented pre-existing, left untouched by scope discipline.

**SUGGESTION**:
1. Ghost-loop risk at audit-logs.e2e-spec.ts:99-101/110-112 — add a companion non-empty assertion before the filter loops so a vacuous pass is impossible.
2. TX-02 second scenario (transactions/spec.md:45-48) still describes MongoMemoryServer helper files; repo now uses real MongoDB via global-setup — future doc cleanup.
3. `any` usage in audit-poll.ts (2 sites) could be typed (e.g., `PollResult<T>` diagnostics) to reach biome-clean; cosmetic.

### Verdict

**PASS** — All 15 tasks complete; 10/10 spec scenarios compliant with runtime test evidence (unit 717/717, helpers 8/8, e2e 68/68); TDD protocol followed; the two WARNINGs are a spec-required production fix (scope deviation) and a pre-existing environmental dist/ permission issue, neither caused by nor blocking this change.