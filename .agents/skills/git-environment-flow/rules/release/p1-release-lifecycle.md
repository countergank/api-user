---
priority: P1
category: release
---

# Release branches follow SemVer lifecycle with annotated tags

**Do**: Cut `release/x.y.z` from `develop` at scope freeze, allow only bugfixes, merge through staging to main, create annotated tags, backmerge, and delete the release branch.
**Avoid**: Merging unfinished features into release branches, skipping staging curation, omitting tags, or leaving release branches alive after the cycle completes.
**Reference**: [Semantic Versioning](https://semver.org/)

## Release Lifecycle

```
develop ──cut──▶ release/x.y.z ──bugfixes──▶ staging (vX.Y.Z-rcN) ──approve──▶ main (vX.Y.Z) ──backmerge──▶ develop ──delete release branch
```

## Lifecycle Stages

1. **Cut**: Branch `release/x.y.z` from `develop` when scope is frozen. The version follows SemVer (`x.y.z`).
2. **Stabilize**: Only bugfixes are allowed on the release branch. No new features.
3. **Stage**: Merge `release/x.y.z` into `staging` for curation testing. Create annotated tag `vX.Y.Z-rcN` on staging.
4. **Release**: After staging approval, merge `release/x.y.z` into `main`. Create annotated tag `vX.Y.Z` on main with version and date.
5. **Backmerge**: Merge `main` into `develop` to sync the release.
6. **Cleanup**: Delete the `release/x.y.z` branch. Tags `vX.Y.Z` and `vX.Y.Z-rcN` remain as records.

## Tag Format

| Tag | Location | Type | Example |
|-----|----------|------|---------|
| `vX.Y.Z-rcN` | staging | Annotated | `git tag -a v1.2.0-rc1 -m "RC1 1.2.0 - 2026-06-24"` |
| `vX.Y.Z` | main | Annotated | `git tag -a v1.2.0 -m "Release 1.2.0 - 2026-06-24"` |

## Rules

- **SemVer only** — release branch names and tags follow `x.y.z` format.
- **Annotated tags** — use `git tag -a` with version and date in the message.
- **Bugfixes only after cut** — no feature work on release branches.
- **Delete after cycle** — release branches are temporary; delete them after backmerge.

## Concrete Examples

```
✅ Good: release/1.2.0 cut from develop, only bugfixes merged, tagged v1.2.0-rc1 on staging
✅ Good: release/1.2.0 merged to main, tagged v1.2.0 with date, backmerged to develop, branch deleted
✅ Good: git tag -a v1.2.0 -m "Release 1.2.0 - 2026-06-24"
❌ Bad:  release/1.2.0 has new feature commits after cut
❌ Bad:  Lightweight tag (git tag v1.2.0) instead of annotated
❌ Bad:  release/1.2.0 branch still exists after production release
❌ Bad:  Tag message missing date: git tag -a v1.2.0 -m "Release 1.2.0"
```
