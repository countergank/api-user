# Apply Progress: COU-223 — Refactor test directory & remove httpyac

Status: 14/15 tasks complete; T8.3 blocked (infrastructure). T1.2 resolved via remediation.
Mode: Strict TDD. Artifact store: hybrid. Delivery: single PR (auto-chain, forecast Low).

## Commits

| Commit | Message |
|--------|---------|
| `caa2a69` | test(cou-223): remove httpyac stub and dead test files |
| `e9addbe` | test(cou-223): move e2e specs into test/e2e/{domain} layout |
| `68e6f99` | test(cou-223): add bounded audit-poll helper with fake-timer unit tests |
| `529cb00` | test(cou-223): replace audit-logs sleeps with poll helper, dedupe profile tests |
| `355a6ab` | test(cou-223): migrate test helpers into src/test-utils (remediation) |

## Work Unit Evidence

| Unit | Focused test command and exact result | Runtime harness command/scenario and exact result | Rollback boundary |
|------|---------------------------------------|---------------------------------------------------|-------------------|
| U1 deletions + TX-02 doc | `npm run build` → success; `npm run test:unit` → 717/717, 67 suites | N/A — dead files with zero live references (grep-verified); deletion cannot alter runtime | `git revert caa2a69` restores all 4 files + doc line; index.ts untouched by this unit |
| U2 moves | `npx tsc --noEmit -p tsconfig.json` → exit 0 (all moved specs compile); `npx jest --config ./test/jest-e2e.json --listTests` → 8 files, 70 `it()` collected | e2e suite — BLOCKED (no Docker/Mongo in WSL distro); CI `test.yml` provides Mongo+Redis | `git revert e9addbe` renames specs back; only test/ files involved |
| U3 audit-poll helper + config + script | `npm run test:helpers` → 8/8 passed, 1 suite | N/A — pure-logic fake-timer unit test; no runtime boundary | `git revert 68e6f99` deletes helper, config, script; no other file references them yet |
| U4 sleep replacement + dedupe | `npx tsc --noEmit -p tsconfig.json` → exit 0; static count 68 `it()` (70 − 2 dupes) | e2e suite — BLOCKED (infra, same as U2); helper unit tests prove poll behavior | `git revert 529cb00` restores sleeps + duplicate tests; helper still present |
| U5 full verification | `npm run build` → success; `npm run test:unit` → 717/717, 67 suites | `npm run test:e2e -- --runInBand` → BLOCKED: `Server selection timed out after 10000 ms` at global-setup (no MongoDB; Docker unavailable in this WSL distro). Must run on CI/machine with Docker. | Entire change reverts cleanly commit-by-commit |
| U6 remediation — migrate helpers into src/test-utils | `npm run test:unit` → 717/717, 67 suites (RED: 0/1 focused spec failed `TS2307 Cannot find module '../../test/helpers'`; GREEN: 717/717 after re-pointing imports); `npm run test:helpers` → 8/8; `npm run build` → success; `npx tsc --noEmit` → exit 0 | N/A — dev-only test helpers, no runtime boundary (excluded from production build via `tsconfig.build.json` `src/test-utils`; verified absent from `dist/`) | `git revert 355a6ab` restores `test/helpers/index.ts` (rename) + original importers; only spec imports and tsconfig.build.json touched |

## TDD Cycle Evidence (Strict TDD)

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| T1.1–T1.3 deletions | N/A (no new behavior) | N/A | ✅ 717/717 baseline | N/A — structural deletion, nothing to test-first | ✅ build + 717/717 after deletion | ➖ Single (structural) | ✅ grep-verified no residue |
| T2.1–T2.2 moves | approval = existing e2e specs | E2E | ✅ 717 unit + 70 `it()` baseline | N/A — no new behavior, moves preserve specs | ✅ tsc clean, 70 `it()` collected unchanged | ➖ Single (structural) | ✅ import paths normalized |
| T3.1–T3.2 helper + config | `test/helpers/audit-poll.spec.ts` | Unit | N/A (new files) | ✅ Written first (module missing → suite failed) | ✅ 1/1 after `audit-poll.ts` created | ✅ 8 cases (success, poll-retry, timeout diagnostics, interval pacing, error recovery, persistent error, endpoint success, endpoint retry) | ✅ biome clean (4 errors fixed; 5 `any` warns remain, design-consistent) |
| T4.1–T4.2 helper tests | `test/helpers/audit-poll.spec.ts` | Unit | N/A (new) | ✅ (covered by T3 RED) | ✅ 8/8 `npm run test:helpers` | ✅ 8 cases | ✅ test harness fix: attach `rejects` assertions before advancing fake timers |
| T5.1 sleep → poll | `test/helpers/audit-poll.spec.ts` (behavior proof) | Unit + E2E | ✅ 8/8 helper green | N/A — refactor of existing e2e; behavior proven by helper unit tests | ✅ e2e edits compile; no `setTimeout` residue | ➖ 2 call sites | ✅ replaced redundant GET+assert blocks with single helper call |
| T6.1 dedupe profile | `test/e2e/auth/auth.e2e-spec.ts` (approval) | E2E | ✅ 70 `it()` baseline | N/A — deletion of duplicates; canonical spec keeps coverage | ✅ 68 `it()` total, canonical user-profile spec untouched (5 profile refs) | ➖ Single (structural) | ✅ removed now-dead `token` variable |
| T7.1 TX-02 doc | N/A (doc only) | N/A | N/A | N/A | N/A | ➖ Single | ✅ wording matches real infra (global-setup rs0) |
| T8.1–T8.2 build + unit | full suite | Unit | ✅ 717 baseline | N/A | ✅ build success + 717/717 | ➖ | ✅ |
| T8.3 e2e | full e2e suite | E2E | ✅ 70 `it()` baseline collected | N/A | ❌ BLOCKED — infra (no Mongo/Docker); not a test failure | ➖ | — |
| T1.2 remediation | 12 affected src specs (approval) + full suite | Unit | ✅ 717/717 baseline (pre-change) | ✅ RED: `npx jest auth/auth.controller.spec.ts` → 1 suite failed, TS2307 `Cannot find module '../../test/helpers'` after deleting index.ts | ✅ GREEN: 717/717, 67 suites after re-pointing 12 importers to `../test-utils` (depth-relative) | ✅ 12 import sites across 4 depth levels verified; zero `test/helpers` references in src/ and test/ | ✅ `tsconfig.build.json` excludes `src/test-utils`; build success; `src/test-utils` absent from dist/; `npm run test:helpers` 8/8; tsc exit 0; pre-commit husky `npm test` 717/717 |

## Deviations from Design

1. **~~`test/helpers/index.ts` NOT deleted (T1.2 partial)~~ RESOLVED via remediation (commit `355a6ab`)** — design/exploration claimed "zero imports anywhere"; this was FALSE: 12 unit spec files under `src/` import `Mock`/`createConnection`/`clearMongoCollection`/`clearMongoConnection` from `.../test/helpers`. Per user decision, the 12 importers were migrated to a new `src/test-utils/index.ts` (identical content, git rename detected), and `test/helpers/index.ts` deleted. `tsconfig.build.json` now excludes `src/test-utils` so these dev-only helpers never ship in the production build. ETH-10 and ETH-13 both hold now.
2. **Import path updates added to moves (T2.1)** — design's file-change table said "git mv" only, but moved specs use relative imports (`./helpers/...`, `../src/...`) that would break at the new depth. Adjusted to `../../helpers/...`, `../../../src/...` so ETH-08 "collection unchanged" and ETH-01 (createTestApp) hold. Necessary, not a scope expansion.
3. **`waitForAuditRow` first parameter renamed `app` → `_app`** — cosmetic; design signature preserved (callers pass positionally). Biomes `noUnusedVariables` flags the unused param; underscore prefix is the repo-compliant idiom.

## Issues Found

1. **Stale `dist/` owned by root** (pre-existing, Aug 9 Docker build) blocked `nest build` (`deleteOutDir` rmdir EACCES). Worked around by renaming to `dist.stale-root-owned/` (untracked, left for cleanup: `sudo rm -rf dist.stale-root-owned`). Gitignored build artifact only.
2. **Missing `@scalar/nestjs-api-reference` in node_modules** (pre-existing, package.json has ^1.2.12, latest commit #392 added it). Fixed with `npm install` — unrelated to this change.
3. **Pre-existing biome errors in `test/e2e/audit-logs/audit-logs.e2e-spec.ts`**: duplicate `beforeAll` hooks (noDuplicateTestHooks) and unused `adminUser` const — present in the original file before this change; CI lint targets `./src` only. Left untouched (scope discipline), noted for a future cleanup.
4. **Historical reference remains in `.git/gentle-ai/review-transactions/`** (past review ledger) to the deleted `test/i18n/i18n.service.spec.ts` — immutable git-internal evidence, not actionable.
5. **E2E execution blocked locally** — Docker Desktop not WSL-integrated in this distro; no mongod/redis-server binaries; ports 27017/6379 closed. `make up ENV=development` requires Docker. CI `test.yml` provides `mongo:6.0.3 --replSet rs0` + `redis:7-alpine` and runs `npm run test:e2e` — e2e verification MUST happen there or on a Docker-enabled machine.

## Verification Summary (local)

- `npm run build` → success (final)
- `npm run test:unit` → 717/717, 67 suites, 0 failures (final; also via pre-commit husky hook on commit 355a6ab)
- `npm run test:helpers` → 8/8 (final)
- `npx tsc --noEmit -p tsconfig.json` → exit 0 (all moved/edited specs typecheck)
- `npx jest --config ./test/jest-e2e.json --listTests` → 8 files under `test/e2e/{domain}/`, 68 `it()` cases
- `npm run test:e2e -- --runInBand` → BLOCKED at global-setup (Server selection timed out) — infra only
- Migration greps: `grep -rn "test/helpers" --include="*.ts" src/` → 0; same in `test/` → 0; `dist/test-utils` → absent (build excludes it)
