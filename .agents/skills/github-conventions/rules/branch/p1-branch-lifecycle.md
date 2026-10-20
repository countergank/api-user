---
priority: P1
category: branch
---

# Follow a clean branch lifecycle

**Do**: Create branches from the latest `develop` (the integration branch `git-environment-flow` defines), rebase regularly to stay up to date, and delete branches after they are merged.
**Avoid**: Branching from `main` or `staging`, long-lived branches that fall behind `develop`, merge commits to integrate changes (prefer rebase), and leaving merged branches cluttering the remote.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow); base branch and promotion flow: `git-environment-flow`.

## Lifecycle Stages

### 1. Creation

- Branch from the **latest** `develop`.
- Update your local `develop` before branching: `git fetch origin --prune && git switch develop && git pull`.
- Name the branch following `p0-branch-naming.md` conventions: for ticket work, the
  `branchName` Linear returns, verbatim.
- Create it without an upstream, so a bare `push` cannot target an integration branch:
  ```
  git switch -c "$BRANCH" --no-track origin/develop
  ```

### 2. Development

- Commit frequently with meaningful messages — after the person authorizes each commit.
- **Rebase onto `develop`** before requesting review to resolve conflicts early:
  ```
  git fetch origin
  git rebase origin/develop
  ```
- Avoid `git merge develop` into your branch — it creates noisy history.

### 3. Review

- Push the branch and open a PR against `develop`.
- If review feedback requires changes, amend or add commits on the same branch.
- Force-push after rebasing: `git push --force-with-lease`.

### 4. Merge and Cleanup

- After the PR is merged, **delete the remote branch** (GitHub offers this button).
- Delete the local branch: `git branch -d <branch-name>`.
- Prune stale remote-tracking branches: `git fetch --prune`.

## Stale Branch Detection

| Age | Action |
|-----|--------|
| > 14 days without activity | Author should update or explain delay |
| > 30 days without activity | Consider closing the PR and archiving the branch |
| Merged but not deleted | Delete immediately |

**Examples**:
```
✅ Good: Branch created from latest develop with --no-track, rebased before
         review, deleted after merge.
❌ Bad:  Branch created from main, 3 weeks behind develop, 12 merge commits
         from integrating develop, never deleted after merge.
```
