# Exploration: COU-223 — Refactor test directory & remove httpyac

Date: 2026-08-18 · Explorer: sdd-explore · Project: api-user

## Current State

Two jest configurations exist:
- **Unit**: package.json `jest` block — `rootDir: src`, `testRegex: ".*\.spec\.ts$"`, setup `test/jest.setup.ts`. 67 suites / 717 tests, all passing, ~101 s wall time (measured).
- **E2E**: `test/jest-e2e.json` — `rootDir: .`, `testRegex: ".e2e-spec.ts$"`, `globalSetup: ./global-setup.js`, `setupFiles: ./jest.setup.ts`, `testTimeout: 30000`. 70 `it()` across 8 spec files; 68 pass, 2 fail (audit-logs async persistence).

E2E boots the real app per suite (`test/helpers/create-test-app.ts` — full AppModule on Fastify, `listen(0)`), against docker-compose MongoDB replica set + Redis (local) or GitHub Actions services (CI `test.yml`). `global-setup.js` (plain JS) flushes Redis and seeds 12 permissions + 3 roles; `jest.setup.ts` sets test-tuned env (raised throttle, low lockout threshold) and loads `.env.local.testing`.

## httpyac — usage analysis

- **Not a dependency**: absent from `package.json` deps/devDeps, `package-lock.json`, `yarn.lock`, `Makefile`, `.github/workflows/*`, `.vscode/*`, README.
- **Single residue**: `test/httpyac/main/main.http` — a 3-line stub (`@host` variable + `GET /`). No real requests.
- **Elimination = delete the `test/httpyac/` directory**. No package changes, no script changes, no CI changes. Zero-risk removal.

## Full test/ inventory (17 git-tracked files)

| File | Purpose | Tests |
|------|---------|-------|
| `app.e2e-spec.ts` | `GET /` version smoke test | 1 |
| `auth.e2e-spec.ts` | register/verify-email/login/refresh/forgot-password + `GET /users/profile` | 10 |
| `password-strength.e2e-spec.ts` | password rules on register + change-password | 12 |
| `rbac.e2e-spec.ts` | admin listing of permissions/roles | 4 |
| `user-profile.e2e-spec.ts` | profile GET/PATCH, change-password | 5 |
| `audit-logs.e2e-spec.ts` | admin audit-log list/filter/paginate + async creation | 8 |
| `e2e/i18n/i18n.e2e-spec.ts` | i18n errors, language detection, validation messages | 15 |
| `user/admin-crud-pagination.e2e-spec.ts` | admin user update/delete/active + pagination + validation | 15 |
| `helpers/create-test-app.ts` | boot AppModule (Fastify, random port) | — |
| `helpers/seed-admin.ts` | idempotent ADMIN seed + login token | — |
| `helpers/index.ts` | **DEAD** — MongoMemoryReplSet helpers, zero imports anywhere | — |
| `helpers/seed-admin.spec.ts` | **ORPHANED** — never matched by any jest config (unit rootDir=src; e2e regex `.e2e-spec.ts$`) | 6 |
| `i18n/i18n.service.spec.ts` | **ORPHANED duplicate** of `src/common/i18n/i18n.service.spec.ts` (differs; runs nowhere) | 3 |
| `httpyac/main/main.http` | httpyac stub (see above) | — |
| `global-setup.js` | flush Redis; seed permissions/roles via mongodb driver | — |
| `jest.setup.ts` | env defaults + throttle/lockout tuning | — |
| `jest-e2e.json` | active e2e config | — |

Also: **root `jest.e2e.config.js` is dead** — git-tracked, referenced nowhere; active config is `test/jest-e2e.json`. `coverage/` is gitignored (local artifact only).

## E2E structure problems

- **Inconsistent layout**: 6 specs at `test/` top level vs nested `test/e2e/i18n/` and `test/user/` (COU-215 moved i18n; others never moved).
- **Duplication**: `auth.e2e-spec.ts` `GET /users/profile` (2 tests) overlaps `user-profile.e2e-spec.ts` `GET /users/profile` (2 tests) — same endpoint, near-identical assertions.
- **2 known failures** (68/70): `audit-logs.e2e-spec.ts` "create audit log entry when user registers/logs in" — fixed `setTimeout(500)` sleeps before asserting async audit persistence. Race-prone: slow CI writes `total` may still be 0.
- **External state**: real Mongo + Redis required; `global-setup.js` hardcodes MONGO_URI with `dev_user`/`dev_password`. No Mongo cleanup between runs — users/roles/audit rows accumulate; `Date.now()` emails mitigate collisions, but audit-logs filter assertions observe cross-run residue.
- **Cache ordering smell**: `rbac.e2e-spec.ts` re-seeds via app services in `beforeAll` specifically to bypass stale Redis cache (global-setup flushes Redis but seeding happens after app cache-warm).
- **Throttle risk**: `jest.setup.ts` sets `MAX_LOGIN_ATTEMPTS=3`, `LOCKOUT_DURATION_MINUTES=1` — parallel suites could trip lockouts.

## Unit structure

- 67 suites / 717 tests, all passing, ~101 s (1m42s). 5 suites use `mongodb-memory-server` (`audit-log.repository`, `audit.integration`, `audit.module`, `audit-log.entity`, `user.repository`) — the heaviest, likely dominate runtime.
- Mixed conventions: `__tests__/` subfolders vs side-by-side specs; the two orphaned specs in `test/` show this drift.
- Coverage thresholds: statements 55 / branches 45 / functions 35 / lines 55.

## Approaches

1. **Hygiene-only cleanup (delete)** — remove `test/httpyac/`, root `jest.e2e.config.js`, orphaned `seed-admin.spec.ts` + `i18n/i18n.service.spec.ts`, dead `helpers/index.ts`.
   - Pros: zero behavior risk; directly satisfies "eliminar httpyac"; tiny diff.
   - Cons: does not address flakiness, duplication, or layout; low value beyond tidiness.
   - Effort: Low.

2. **Reorganize + fix flakiness (recommended)** — everything in (1), plus: move all e2e specs under `test/e2e/{domain}/` with consistent naming; replace the two `setTimeout(500)` audit-logs assertions with a poll/retry helper (wait until the log row exists, bounded); dedupe the overlapping `GET /users/profile` tests; optionally add per-suite collection cleanup or scope audit assertions to `Date.now()`-unique actions.
   - Pros: kills the 2 flaky failures properly, fixes layout/duplication, shrinks the test surface; still a test-only change, no app code.
   - Cons: moving files touches CI-visible paths (safe — `npm run test:e2e` is config-driven, regex-based, not path-based); poll helper must be bounded to avoid hiding real regressions.
   - Effort: Medium.

3. **Full harness upgrade** — per-suite isolated Mongo (mongodb-memory-server or testcontainers) for e2e, standardized seed fixtures, env consolidation, CI parity.
   - Pros: hermetic, fast, repeatable tests.
   - Cons: large diff, new infra, way beyond ticket scope ("mejorar tests e2e" is bounded).
   - Effort: High.

## Recommendation

**Approach 2**, scoped tightly to the ticket: (a) delete httpyac dir, root `jest.e2e.config.js`, orphaned/dead test files; (b) standardize layout under `test/e2e/`; (c) fix the 2 audit-logs failures with a bounded poll helper instead of sleeps; (d) dedupe the `/users/profile` overlap. This delivers the ticket's two goals ("mejorar tests e2e", "eliminar httpyac") without expanding into harness redesign. Approach 3 is a separate future change if hermetic e2e becomes a priority.

## Affected Areas

- `test/httpyac/` — delete (ticket mandate)
- `jest.e2e.config.js` (root) — delete (dead config)
- `test/helpers/index.ts`, `test/helpers/seed-admin.spec.ts`, `test/i18n/i18n.service.spec.ts` — delete (dead/orphaned)
- `test/audit-logs.e2e-spec.ts` — fix 2 async tests (poll helper)
- `test/auth.e2e-spec.ts` / `test/user-profile.e2e-spec.ts` — dedupe `/users/profile` coverage
- `test/e2e/**` — move specs into `test/e2e/{domain}/`
- `test/helpers/create-test-app.ts`, `test/helpers/seed-admin.ts` — keep; add audit-poll helper alongside
- `test/jest-e2e.json`, `test/global-setup.js`, `test/jest.setup.ts` — unchanged unless cleanup hook added

## Risks

- Audit-logs poll fix could expose a genuine async persistence bug (if rows never appear) — investigate before labeling flaky.
- Test file moves: verify CI `test.yml` still collects via config regex (it does — `npm run test:e2e`, config-driven).
- Deleting `test/helpers/index.ts` is safe (zero imports) but confirm no external script/CI references at apply time.
- `global-setup.js` must stay plain JS (jest globalSetup cannot use ts-node without extra config).
- Review budget: mostly deletions + small helpers — well under 400 lines of authored additions.

## Ready for Proposal

Yes. Tell the user: exploration confirms httpyac is only a 3-line stub directory (not a dependency) — removal is trivial; the real work is reorganizing e2e layout, fixing the 2 flaky audit-logs tests, and deleting dead/orphaned test files.
