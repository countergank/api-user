# Proposal: Add CI Test Job (COU-216)

## Intent

PRs can pass CI with broken tests — no test job exists in the workflow lineup. Unit (717) and e2e (68/70) suites are green but unenforced. This change adds a `test` job that fails PRs when tests break.

## Scope

### In Scope
- `test` job in a new GitHub Actions workflow: `npm ci` → `npm test` (unit) → `npm run test:e2e`
- MongoDB + Redis service containers for e2e dependencies
- Job triggers on PRs targeting develop/staging/main
- Failure blocks merge

### Out of Scope
- Fixing the 2 failing e2e tests (COU-215 covers one; the other is known)
- Coverage reporting or artifact uploads
- Test matrix/parallelization
- Caching `node_modules` (follow-up optimization)

## Capabilities

### New Capabilities
- `ci-test-workflow`: GitHub Actions workflow that runs unit + e2e tests per PR, with MongoDB 6 + Redis 7 service containers

### Modified Capabilities
- None — no spec-level behavior change in application code

## Approach

Create `.github/workflows/test.yml` modeled after existing workflow conventions. Use `ubuntu-latest`, Node 22 (per `.nvmrc`), MongoDB 6.0 and Redis 7 service containers with root credentials matching `global-setup.js` (`dev_user`/`dev_password`). Set `DATABASE_HOST=localhost`, `REDIS_HOST=localhost`, and e2e env vars (`JWT_SECRET`, `ENCRYPTION_PASSWORD`, `DATABASE_NAME=api_user`). Run e2e with `--forceExit` to prevent open-handle hangs.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/` | New | `test.yml` workflow file |
| `openspec/config.yaml` | Modified | Add `ci_command` to testing config |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| E2e test flakiness blocks legitimate PRs | Medium | Retry on `workflow_dispatch`; mark known-flaky tests as follow-up |
| Service container auth mismatch with `global-setup.js` | Low | Match `MONGO_INITDB_ROOT_USERNAME`/`PASSWORD` to hardcoded `dev_user`/`dev_password` |
| CI runtime exceeds free-tier limits | Low | Unit ~30s, e2e fits within runner timeout |

## Rollback Plan

Remove `.github/workflows/test.yml`, revert `config.yaml`. No DB migrations or code changes.

## Dependencies

- None (CI-only change, no application code)

## Success Criteria

- [ ] PR checks include test results; failures block merge
- [ ] Unit suite: 717 tests pass, coverage thresholds met (55% stmts)
- [ ] E2e suite: runs against service containers, ≥68/70 pass
- [ ] Workflow completes in <5 min
