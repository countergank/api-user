---
priority: P1
category: hotfix
---

# Hotfixes branch from main and backmerge to develop only

**Do**: Create `hotfix/*` from `main`, merge to `main` for immediate deploy with a patch tag, then backmerge to `develop` only.
**Avoid**: Merging hotfixes to `staging` directly, branching hotfixes from `develop`, or skipping the backmerge step.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Hotfix Flow Diagram

```
main ──branch──▶ hotfix/description ──merge+tag──▶ main ──backmerge──▶ develop
                                                              │
                                                              └── staging receives fix via next release
```

## Hotfix Lifecycle

1. **Branch from main**: Create `hotfix/<description>` from the current `main` to fix the production bug.
2. **Merge to main**: After review, merge the hotfix to `main` and tag with a patch bump (e.g., `v1.2.0` → `v1.2.1`).
3. **Backmerge to develop**: Merge `main` into `develop` to propagate the fix. This is a single backmerge — do not merge to staging separately.
4. **Staging receives the fix**: Staging gets the hotfix code through the next release branch cut from `develop`, not through a direct merge.

## Rules

- **Hotfixes are production-only** — branch from `main`, not from `develop` or `staging`.
- **Patch tag required** — every hotfix merge to `main` gets an annotated patch tag.
- **No direct staging merge** — staging receives fixes via the next release, maintaining the curation model.
- **Backmerge is mandatory** — skipping it causes develop to diverge from production.

## Protection Bypass

`hotfix/*` branches bypass branch protection on `staging` and `main`. This is the only exception to the standard promotion chain protection.

- **Why**: Hotfixes are emergency production fixes that cannot wait for staging curation.
- **Scope**: Bypass applies only to `hotfix/*` branches. All other branches follow standard protection rules.
- **Tradeoff**: Acceptable because hotfixes are small, targeted, and already reviewed before merge.

**Cross-reference**: See `rules/environment/p0-environment-branches.md` → "Hotfix Exception" section for full protection settings.

## Concrete Examples

```
✅ Good: hotfix/critical-security-patch branched from main, merged to main, tagged v1.2.1, backmerged to develop
✅ Good: Next release/1.3.0 cut from develop includes the hotfix code, merged to staging as usual
❌ Bad:  hotfix/* branched from develop
❌ Bad:  hotfix merged to staging directly
❌ Bad:  hotfix merged to main but not backmerged to develop
❌ Bad:  Hotfix tagged as minor bump (v1.3.0) instead of patch (v1.2.1)
```
