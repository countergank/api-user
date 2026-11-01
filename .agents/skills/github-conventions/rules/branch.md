# Branch — Priority P0–P1

Read this file when you create a branch, integrate changes from `develop`, or clean up after a merge.

## P0 — Take the ticket branch name from the convention

When the work has an issue, the branch name is `feature/<issue-number>-<short-slug>` — 3–5 words from the issue title, kebab-case, lowercase, ASCII only, with the number first. The convention is owned by the `github-tickets` skill; never change the number, never invent a different prefix, so the branch and the PR's `fixes #<number>` stay traceable. When the work has no ticket, name the branch `type/description` in lowercase kebab-case, 3-5 words, with `type` from the table. Branch names carry no personal prefixes, no date prefixes, no uppercase letters, and no underscores; git history and PR metadata track the author. Without a ticket, do not invent a ticket slug: `feat/add-oauth` beats a fabricated `#<number>`. The `kickoff` skill composes the branch name and creates the branch.

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New feature or capability | `feat/oauth2-login` |
| `feature` | Same as `feat`; the ticket-branch prefix from the convention | `feature/240-arreglar-scroll` |
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

```
# ✅ Convention branch from the issue, and readable author-chosen names
feature/262-corregir-los-codigos-de-estado-de-los-endpoints
feat/oauth2-login
docs/api-quickstart
```

```
# ❌ Decorated or truncated numbers, or names that break the convention
feat/#262-auth-action-status-codes
feature/262-auth-status
john/fix-auth
feat/add_OAuth2_Login
2024-06-fix-bug
fix
```

## P1 — Create the branch from develop, rebase, delete after merge

Create every branch from the latest `develop`: `git fetch origin --prune && git switch develop && git pull`, then `git switch -c "$BRANCH" --no-track origin/develop`. The `--no-track` flag leaves the branch without an upstream, so a bare `git push` cannot target an integration branch.

While developing, commit frequently with meaningful messages, after the person authorizes each commit. Rebase onto `origin/develop` to stay current and resolve conflicts early; `git merge develop` into the branch creates noisy history and is not used.

Push the branch and open a PR against `develop`. If review feedback requires changes, amend or add commits on the same branch. After rebasing, push with `git push --force-with-lease`, which refuses to overwrite work the remote has that you have not seen.

After the PR merges, delete the remote branch (GitHub offers this button) and the local branch with `git branch -d <branch-name>`, then `git fetch --prune` to drop stale remote-tracking refs.

| Branch state | Action |
|--------------|--------|
| > 14 days without activity | Author updates the branch or explains the delay |
| > 30 days without activity | Consider closing the PR and archiving the branch |
| Merged but not deleted | Delete it immediately |

```
# ✅ Latest develop, no upstream, rebased, deleted after merge
git fetch origin --prune && git switch develop && git pull
git switch -c "$BRANCH" --no-track origin/develop
git fetch origin && git rebase origin/develop
git push --force-with-lease
git branch -d "$BRANCH" && git fetch --prune
```

```
# ❌ Wrong base, merged develop in, never cleaned up
git switch -c feat/thing main
git merge develop
git push
# the branch stays on the remote months after the merge
```
