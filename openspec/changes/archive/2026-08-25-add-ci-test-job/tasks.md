# Tasks: Add CI Test Job (COU-216)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60–80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add test workflow + config | PR 1 | `npm test && npm run test:e2e` | `gh workflow run test.yml --ref <branch>` | Delete `.github/workflows/test.yml`, revert `config.yaml` |

## Phase 1: CI Workflow

- [ ] 1.1 Create `.github/workflows/test.yml` with `pull_request` trigger for develop/staging/main, Node 20 (matches `.nvmrc`), MongoDB 6 + Redis 7 service containers, `DATABASE_USER=dev_user`, `DATABASE_PASSWORD=dev_password`, `DATABASE_HOST=localhost`, `REDIS_HOST=localhost`, `DATABASE_NAME=api_user`, and placeholder secrets for `JWT_SECRET` + `ENCRYPTION_PASSWORD`
- [ ] 1.2 Add `ci_command: npm test && npm run test:e2e` to `openspec/config.yaml` under `testing`
- [ ] 1.3 Push a branch + open a draft PR to verify workflow triggers and passes against this branch

## Phase 2: Verification

- [ ] 2.1 Confirm all 717 unit tests pass in CI
- [ ] 2.2 Confirm ≥68/70 e2e tests pass in CI
- [ ] 2.3 Confirm workflow completes in under 5 minutes
- [ ] 2.4 Confirm test failure blocks merge on the PR
