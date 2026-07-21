---
priority: P0
category: environment
---

# Maintain three permanent environment branches

**Do**: Maintain `develop` (default HEAD, integration), `staging` (pre-production mirror), and `main` (production, always deployable, protected) in every Countergank repository.
**Avoid**: Direct pushes to `main`, using `main` as the default branch, or omitting any of the three branches.
**Reference**: [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)

## Branch Purposes

| Branch | Role | Default HEAD | Required Reviewers |
|--------|------|:---:|:---:|
| `develop` | Integration branch — all features merge here first | Yes | 1 |
| `staging` | Pre-production mirror — curation testing before production | No | 1 |
| `main` | Production source — always deployable, protected | No | 1 |

## Branch Protection Settings

| Setting | `develop` | `staging` | `main` |
|---------|-----------|-----------|--------|
| Require pull request | Yes | Yes | Yes |
| Required reviewers | 1 | 1 | 1 |
| Dismiss stale reviews | Yes | Yes | Yes |
| Require last push approval | Yes | Yes | Yes |
| Require status checks | Yes | Yes | Yes |
| Require branches up to date (strict) | No | Yes | Yes |
| Restrict who can push | No | Yes (release/* only) | Yes (release/* and hotfix/* only) |
| Allow force pushes | No | No | No |
| Allow deletions | No | No | No |
| Include administrators | Yes | Yes | Yes |
| Admin bypass (pull request) | Yes | Yes | Yes |

> **GitHub note**: These settings map to "Branch protection rules" in repository settings. "Include administrators" enforces all rules for admins too. "Admin bypass (pull request)" uses `bypass_pull_request_allowances` to let designated users skip PR requirements — remove specific users when the team grows.

### Solo Work Bypass Pattern

When working solo, the admin needs `bypass_pull_request_allowances` on ALL branches to self-merge PRs. This is a temporary pattern — remove specific users from the bypass list when the team grows.

**Required fields in `bypass_pull_request_allowances`:**
- `users`: Array of GitHub usernames allowed to bypass (e.g., `["leandrojaviercepeda"]`)
- `teams`: Empty array `[]`
- `apps`: Empty array `[]`

### GitHub API Reference

```json
{
  "required_status_checks": { "strict": false, "contexts": ["<repo-specific>"] },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_last_push_approval": true,
    "bypass_pull_request_allowances": {
      "users": ["<github-username>"],
      "teams": [],
      "apps": []
    }
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

> **Status check names are repo-specific.** Each repository defines its own checks (lint, test, build) based on its stack. This skill requires that checks exist, not which ones.

### `develop` Protection

**Intent**: Integration branch — fast iteration with basic quality gates.

- **Required reviewers**: 1 (one approval required)
- **Status checks**: Required (CI must pass — lint, test, build per repo config)
- **Dismiss stale reviews**: Yes (re-approve after new commits)
- **Require last push approval**: Yes (last push must be approved by someone other than the pusher; bypass skips this)
- **Force push**: Blocked (history preservation)
- **Admin bypass**: Pull request bypass allowed (for solo work; remove when team grows)
- **Direct push**: Blocked (PR-only workflow)

**Why**: `develop` needs fast iteration but not zero quality. One reviewer catches obvious issues; status checks ensure code compiles and passes basic validation. Admin bypass allows self-merge when working solo — remove it when the team grows.

**Allowed merge paths**: Feature branches (squash merge) → `develop`

### `staging` Protection

**Intent**: Pre-production mirror — requires validation before production.

- **Required reviewers**: 1 (at least one approval)
- **Status checks**: Required (CI must pass)
- **Dismiss stale reviews**: Yes
- **Require last push approval**: Yes
- **Force push**: Blocked
- **Admin bypass**: Pull request bypass allowed (for solo work; remove when team grows)
- **Direct push**: Blocked (only release branches merge here)

**Why**: Staging is the last gate before production. A single review catches obvious issues; status checks ensure CI validation before curation testing begins. Admin bypass allows self-merge when working solo — remove it when the team grows.

**Allowed merge paths**: `release/*` branches only → `staging`

### `main` Protection

**Intent**: Production source — highest protection, multiple approvals required.

- **Required reviewers**: 1 (one approval required; increase to 2 when team grows)
- **Status checks**: Required (CI + staging validation)
- **Dismiss stale reviews**: Yes
- **Require last push approval**: Yes
- **Force push**: Blocked
- **Admin bypass**: Pull request bypass allowed (for solo work; remove when team grows)
- **Direct push**: Blocked (only release/hotfix branches merge here)

**Why**: `main` is production. Two distinct reviewers catch different perspectives; status checks ensure the code was validated in staging first. Admin bypass allows self-merge when working solo — remove it when the team grows.

**Allowed merge paths**: `release/*` branches → `main`, `hotfix/*` branches → `main`

### Hotfix Exception

**Rule**: `hotfix/*` branches bypass staging protection and merge directly to `main`.

**Rationale**: Hotfixes are emergency production fixes that cannot wait for staging curation. The tradeoff is acceptable because hotfixes are small, targeted, and already reviewed before merge.

**Enforcement**: GitHub branch protection rules must allow `hotfix/*` to bypass required reviews/status checks on `staging` and `main`.

**Cross-reference**: See `rules/hotfix/p1-hotfix-flow.md` for hotfix lifecycle details.

## Protection and Flow Interaction

Branch protection enforces the promotion chain by controlling which branches can merge into protected branches:

| Merge Path | Protection Effect |
|------------|-------------------|
| Feature → `develop` | PR required, squash merge. 1 reviewer + CI checks. Admin can bypass PR when working solo. |
| `release/*` → `staging` | PR required from `release/*` only. 1 reviewer + CI checks. Admin can bypass PR when working solo. |
| `release/*` → `main` | PR required from `release/*` only. 1 reviewer + CI/staging checks. Admin can bypass PR when working solo. Increase to 2 reviewers when team grows. |
| `hotfix/*` → `main` | PR required from `hotfix/*` only. Bypasses staging entirely — emergency path. |
| `main` → `develop` | Backmerge allowed. Protected branch pushing to less-protected branch — no conflict. |

> **Key insight**: Protection is consistent across all branches — 1 reviewer, CI required, dismiss stale reviews, require last push approval. The difference is in strictness (develop allows out-of-date branches, staging/main require up-to-date) and allowed source branches (staging only from release/*, main from release/* and hotfix/*). Admin bypass applies to all branches for solo work — remove when the team grows.

## Rules

1. **All three branches MUST exist** in every Countergank repository from initialization.
2. **`develop` is the default branch** — new PRs target `develop` by default.
3. **All branches are protected** — see "Branch Protection Settings" above. Direct pushes are rejected; only PRs from allowed source branches are permitted.
4. **`staging` is a mirror** — it receives code only through the promotion flow (release branch merge), never from feature branches directly.

## Concrete Examples

```
✅ Good: New repo created with develop, staging, main; develop set as default
✅ Good: PR targets develop for a feature branch — squash merge, 1 reviewer, CI must pass
✅ Good: Solo dev merges to develop using admin bypass — temporary, remove when team grows
✅ Good: Solo dev merges release to staging using admin bypass — temporary, remove when team grows
✅ Good: Solo dev merges release to main using admin bypass — temporary, remove when team grows
✅ Good: release/1.2.0 PR targets staging — 1 reviewer required, CI must pass, strict checks
✅ Good: release/1.2.0 PR targets main — 1 reviewer required, CI + staging validation (increase to 2 when team grows)
✅ Good: hotfix/critical-fix PR targets main — bypasses staging, 1 reviewer (or admin merge)
✅ Good: main backmerged to develop — protected pushing to less-protected, allowed
✅ Good: All branches have "Include administrators" enabled
✅ Good: Stale review dismissed after new commits — re-approval required
✅ Good: Last push approved by someone other than the pusher (or bypass for solo dev)
❌ Bad:  Repo has only main branch
❌ Bad:  main is the default branch
❌ Bad:  Feature branch PR targets staging directly
❌ Bad:  Direct push to main bypasses PR
❌ Bad:  staging has 0 reviewers — curation is unvalidated
❌ Bad:  force push to main destroys production history
❌ Bad:  Merged PR with stale approval after new commits — dismiss_stale_reviews must be ON
```
