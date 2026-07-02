---
priority: P0
category: environment
---

# Maintain three permanent environment branches

**Do**: Maintain `develop` (default HEAD, integration), `staging` (pre-production mirror), and `main` (production, always deployable, protected) in every Countergank repository.
**Avoid**: Direct pushes to `main`, using `main` as the default branch, or omitting any of the three branches.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Branch Purposes

| Branch | Role | Default HEAD | Protection |
|--------|------|:---:|:---:|
| `develop` | Integration branch — all features merge here first | Yes | No |
| `staging` | Pre-production mirror — curation testing before production | No | No |
| `main` | Production source — always deployable, protected | No | Yes |

## Rules

1. **All three branches MUST exist** in every Countergank repository from initialization.
2. **`develop` is the default branch** — new PRs target `develop` by default.
3. **`main` is protected** — direct pushes are rejected; only merges from release or hotfix branches are allowed.
4. **`staging` is a mirror** — it receives code only through the promotion flow (release branch merge), never from feature branches directly.

## Concrete Examples

```
✅ Good: New repo created with develop, staging, main; develop set as default
✅ Good: PR targets develop for a feature branch
✅ Good: main has branch protection enabled in repo settings
❌ Bad:  Repo has only main branch
❌ Bad:  main is the default branch
❌ Bad:  Feature branch PR targets staging directly
❌ Bad:  Direct push to main bypasses PR
```
