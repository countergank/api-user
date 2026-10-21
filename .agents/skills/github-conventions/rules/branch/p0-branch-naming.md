---
priority: P0
category: branch
---

# Use Linear's `branchName` for ticket work, `type/description` otherwise

**Do**: When the work has a Linear ticket, take the branch name from that ticket's `branchName` field exactly as returned (e.g. `feature/cou-240-arreglar-scroll`). When it has no ticket, name the branch `type/description` in lowercase-kebab-case, where `type` matches one of the allowed types below.
**Avoid**: Rebuilding or "improving" a ticket branch by hand (`feat/COU-240-arreglar-scroll`), which no longer matches Linear's git automation and leaves the ticket in the wrong state. Also avoid personal names in branches (`john/fix-thing`), date prefixes (`2024-01-fix`), ticket-only names (`JIRA-123`), uppercase letters, or underscores.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow); the `linear-tickets` skill (`rules/integration/p1-github-integration.md`) owns the `COU-###` contract.

## Allowed Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature or capability | `feat/oauth2-login` |
| `feature` | Same as `feat`; Linear's default prefix for ticket branches | `feature/cou-240-arreglar-scroll` |
| `fix` | Bug fix | `fix/null-preferences-500` |
| `docs` | Documentation changes | `docs/quickstart-section` |
| `refactor` | Code restructuring, no behavior change | `refactor/auth-module-structure` |
| `perf` | Performance improvement | `perf/reduce-db-queries` |
| `test` | Test additions or corrections | `test/add-auth-integration` |
| `chore` | Tooling, config, maintenance | `chore/update-eslint-config` |
| `ci` | CI/CD pipeline changes | `ci/add-e2e-workflow` |
| `build` | Build system or dependency changes | `build/upgrade-node-20` |
| `revert` | Reverting a previous commit | `revert/feat-oauth2-login` |
| `hotfix` | Urgent production fix (bypasses normal cycle) | `hotfix/critical-security-patch` |

## Naming Rules

1. **One source for ticket branches** — the string Linear returns in `branchName` is the only one its git automation matches (`start`, `review`, `merge`). Never compose it, never extend it: Linear truncates it at its maximum length, so a longer name is a different name.
2. **Readable names when you author them** — lowercase and kebab-case, 3-5 words maximum, no underscores or camelCase.
3. **No personal prefixes** — the author is tracked in git history and PR metadata.
4. **No ticket, no slug** — without a ticket, `feat/add-oauth` is preferred over inventing a `COU-###`.
5. **Kickoff owns the creation** — the `kickoff` skill captures `branchName`, creates the branch from `develop` with `--no-track`, and verifies HEAD matches before the first edit.

**Examples**:
```
✅ Good: feature/cou-262-corregir-los-codigos-de-estado-de-los-endpoints-de-accion-de  ← Linear branchName, verbatim
✅ Good: feat/oauth2-login            ← no ticket
✅ Good: docs/api-quickstart          ← no ticket
❌ Bad:  feat/COU-262-auth-action-status-codes  ← composed by hand, breaks automation
❌ Bad:  feature/cou-262-auth-status  ← shortened branchName, breaks automation
❌ Bad:  john/fix-auth                ← personal prefix
❌ Bad:  feat/add_OAuth2_Login        ← underscores + uppercase
❌ Bad:  2024-06-fix-bug              ← date prefix
❌ Bad:  fix                          ← no description
```
