# Proposal: COU-223 — Refactor test directory & remove httpyac

## Intent

The `test/` directory has accumulated dead code, inconsistent layout, and 2 flaky e2e tests that fail on CI. The ticket mandates "eliminar httpyac" — but httpyac is not a dependency, only a 3-line stub directory. The real value is cleaning up the test surface, fixing the audit-logs race conditions, and establishing a consistent e2e layout so future tests follow a clear pattern.

## Scope

### In Scope
- Delete `test/httpyac/` directory (ticket mandate)
- Delete root `jest.e2e.config.js` (dead config, active is `test/jest-e2e.json`)
- Delete dead/orphaned files: `test/helpers/index.ts`, `test/helpers/seed-admin.spec.ts`, `test/i18n/i18n.service.spec.ts`
- Move all e2e specs under `test/e2e/{domain}/` (auth, user, audit-logs, rbac, password-strength)
- Fix 2 audit-logs flaky tests: replace `setTimeout(500)` with bounded poll helper (wait for row, max 5s)
- Dedupe `GET /users/profile` overlap between `auth.e2e-spec.ts` and `user-profile.e2e-spec.ts`

### Out of Scope
- Hermetic e2e harness (mongodb-memory-server / testcontainers) — separate future change
- Unit test structure changes (`__tests__/` vs side-by-side) — not in ticket
- CI workflow changes — current config-driven collection handles moved files
- Global setup/teardown refactor (Redis flush, Mongo seed) — works today

## Capabilities

### New Capabilities
- None — this is a test infrastructure refactor, no new product capabilities

### Modified Capabilities
- `e2e-test-harness`: test file layout convention changes from flat `test/*.e2e-spec.ts` to `test/e2e/{domain}/*.e2e-spec.ts`; audit-poll helper added to `test/helpers/`

## Approach

Execute Approach 2 from exploration (Medium effort). Deletions first (zero risk), then file moves (CI-safe via regex config), then bounded poll helper for audit-logs (replaces sleeps with `waitFor(condition, timeoutMs)`), then dedupe profile endpoint tests. All changes are test-only — no application code touched.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `test/httpyac/` | Removed | 3-line stub directory |
| `jest.e2e.config.js` (root) | Removed | Dead config file |
| `test/helpers/index.ts` | Removed | Dead MongoMemoryReplSet helpers |
| `test/helpers/seed-admin.spec.ts` | Removed | Orphaned (never matched by jest) |
| `test/i18n/i18n.service.spec.ts` | Removed | Orphaned duplicate of src spec |
| `test/audit-logs.e2e-spec.ts` | Modified | Fix 2 async tests with poll helper |
| `test/auth.e2e-spec.ts` | Modified | Remove duplicate `GET /users/profile` tests |
| `test/user-profile.e2e-spec.ts` | Modified | Keep as canonical profile tests |
| `test/e2e/` | New/Modified | New domain folders + moved specs |
| `test/helpers/` | Modified | Add `audit-poll.ts` helper |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Poll helper exposes real async bug (audit row never appears) | Medium | Bounded timeout (5s); if timeout, fail with clear message — investigate before labeling flaky |
| File moves break CI collection | Low | Config-driven (`test/jest-e2e.json` regex `.e2e-spec.ts$`) — verified |
| Deleting `helpers/index.ts` breaks external script | Low | Zero imports found; confirm at apply time |
| `global-setup.js` must remain plain JS | Low | Jest globalSetup cannot use ts-node without extra config — unchanged |

## Rollback Plan

`git revert` the single commit. All changes are test-only; no migrations, no schema changes, no app behavior changes. If poll helper introduces regression, revert helper and restore `setTimeout` temporarily while investigating.

## Dependencies

- None external. Requires running MongoDB + Redis for e2e verification (existing CI `test.yml` provides).

## Success Criteria

- [ ] `test/httpyac/`, root `jest.e2e.config.js`, 3 dead/orphaned files deleted
- [ ] All e2e specs under `test/e2e/{domain}/` with consistent naming
- [ ] `npm run test:e2e` passes 70/70 (was 68/70) on local and CI
- [ ] No duplicate `GET /users/profile` tests across auth/user-profile specs
- [ ] Review diff < 400 authored lines (mostly deletions + small helper)