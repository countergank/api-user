---
priority: P2
category: tracking
---

# Map GitHub Environments and use tags as deployment markers

**Do**: Map GitHub Environments to branches (`Staging` → `staging`, `Production` → `main`), use release tags as deployment markers, and enable rollback via tag checkout.
**Avoid**: Deploying without environment protection, losing track of which tag is in production, or relying on commit SHAs for rollback.

## Environment Mapping

| GitHub Environment | Target Branch | Purpose |
|--------------------|---------------|---------|
| `Staging` | `staging` | Pre-production curation testing |
| `Production` | `main` | Production deployment |

## Deployment Tracking

- **Deployment status visibility**: When a PR targets `staging` or `main`, the deployment status is visible in the PR/commit view via GitHub Environments.
- **Tags as deployment markers**: Each release tag (`vX.Y.Z`) marks a production deployment. RC tags (`vX.Y.Z-rcN`) mark staging deployments.
- **Changelog generation**: Use `git log v1.1.0..v1.2.0` to generate changelogs between releases.
- **Rollback**: Use `git checkout v1.1.0` to restore a previous production state. Tags are the authoritative rollback targets — not commit SHAs.

## Rules

- **Environments are optional but recommended** — map them when the repo has CI/CD pipelines.
- **Tags are the source of truth** — always use tags, not SHAs, for deployment markers and rollbacks.
- **Changelog between tags** — use tag ranges to generate release notes.

## Concrete Examples

```
✅ Good: GitHub Environment "Production" configured to require main branch
✅ Good: Deployment status visible on PR targeting staging
✅ Good: git log v1.1.0..v1.2.0 --oneline to generate changelog
✅ Good: git checkout v1.1.0 to rollback production
❌ Bad:  Deploying to production without environment protection rules
❌ Bad:  Rollback using a commit SHA instead of a tag
❌ Bad:  No tag on main after a release merge
```
