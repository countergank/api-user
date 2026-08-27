---
priority: P0
category: branch
---

# Use type/description format for branch names

**Do**: Name branches as `type/description` using lowercase-kebab-case, where `type` matches one of the allowed branch types and `description` is a short summary of the change.
**Avoid**: Personal names in branches (`john/fix-thing`), date prefixes (`2024-01-fix`), ticket-only names (`JIRA-123`), uppercase letters, or underscores.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Allowed Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature or capability | `feat/oauth2-login` |
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

1. **Always lowercase** — no `Feat/` or `FIX/`.
2. **Use kebab-case** — hyphens separate words, never underscores or camelCase.
3. **Keep description concise** — 3-5 words maximum.
4. **No personal prefixes** — the author is tracked in git history and PR metadata.
5. **Ticket numbers optional** — `feat/PROJ-42-add-oauth` is fine, but `feat/add-oauth` is preferred.

**Examples**:
```
✅ Good: feat/oauth2-login
✅ Good: fix/null-preferences-500
✅ Good: docs/api-quickstart
❌ Bad:  john/fix-auth                  ← personal prefix
❌ Bad:  feat/add_OAuth2_Login          ← underscores + uppercase
❌ Bad:  2024-06-fix-bug                ← date prefix
❌ Bad:  fix                            ← no description
```
