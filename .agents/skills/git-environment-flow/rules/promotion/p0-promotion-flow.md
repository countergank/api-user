---
priority: P0
category: promotion
---

# Code flows left to right through environments

**Do**: Merge code through the promotion chain: feature → develop → release/x.y.z → staging → main → develop (backmerge).
**Avoid**: Direct merges to `staging` or `main` outside of release or hotfix branches, skipping environments, or merging right to left.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Promotion Flow Diagram

```
feature ──PR(squash)──▶ develop ──cut──▶ release/x.y.z ──merge──▶ staging (vX.Y.Z-rcN)
                             ↑                    │
                             │                    └──merge──▶ main (vX.Y.Z)
                             │                                  │
                             └──────────────────────────────────┘ (backmerge)
```

## Flow Stages

1. **Feature → develop**: Squash merge via PR. All feature work integrates here first.
2. **develop → release/x.y.z**: Branch cut from `develop` at scope freeze. Only bugfixes allowed on the release branch.
3. **release/x.y.z → staging**: Merge for curation testing. Tag with `vX.Y.Z-rcN` on staging.
4. **release/x.y.z → main**: After staging approval, merge release to production. Tag with `vX.Y.Z` (annotated) on main.
5. **main → develop**: Backmerge after production release to keep develop in sync. Delete the release branch.

## Merge Direction Rules

- **No direct merges to staging or main** — only release branches and hotfix branches may target these.
- **Squash merge for features** — feature PRs to develop are squashed to keep history clean.
- **Standard merge for releases** — release merges preserve the full commit history for traceability.
- **Backmerge is mandatory** — every production release must backmerge to develop.

## Concrete Examples

```
✅ Good: feat/login PR squash-merged to develop
✅ Good: release/1.2.0 cut from develop, merged to staging, tagged v1.2.0-rc1
✅ Good: release/1.2.0 merged to main (after staging approval), tagged v1.2.0, backmerged to develop, branch deleted
✅ Good: Both staging and main receive the same release branch content
❌ Bad:  feat/login PR targets staging directly
❌ Bad:  develop merged to main without a release branch
❌ Bad:  release/1.2.0 merged to main but not backmerged to develop
❌ Bad:  Feature branch merged to main directly
❌ Bad:  Staging merged into main (staging is for testing, not the source for production)
```
