---
priority: P1
category: branch
---

# Follow a clean branch lifecycle

**Do**: Create branches from the latest `main` (or the feature branch in a chain), rebase regularly to stay up to date, and delete branches after they are merged.
**Avoid**: Long-lived branches that fall behind `main`, merge commits to integrate changes (prefer rebase), and leaving merged branches cluttering the remote.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Lifecycle Stages

### 1. Creation

- Branch from the **latest** `main` (or from the previous PR branch in a chain).
- Update your local `main` before branching: `git fetch origin && git checkout main && git pull`.
- Name the branch following `p0-branch-naming.md` conventions.

### 2. Development

- Commit frequently with meaningful messages.
- **Rebase onto `main`** before requesting review to resolve conflicts early:
  ```
  git fetch origin
  git rebase origin/main
  ```
- Avoid `git merge main` into your branch — it creates noisy history.

### 3. Review

- Push the branch and open a PR.
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
✅ Good: Branch created from latest main, rebased before review,
         deleted after merge.
❌ Bad:  Branch is 3 weeks behind main, has 12 merge commits from
         integrating main, and was never deleted after merge.
```
