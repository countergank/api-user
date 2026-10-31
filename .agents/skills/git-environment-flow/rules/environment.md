# Environment — Priority P0

Read this file when creating a repository, choosing its default branch, or configuring branch protection.

## P0 — Keep three permanent environment branches

Every repository keeps `develop`, `staging` and `main` from initialization, with `develop` as the default branch. Each answers a different question: where integration happens, where curation is validated, and what is in production. A repository with only `main` has nowhere to integrate before a release, and a `main` that is also the default branch turns production into the integration surface.

| Branch | Role | Default HEAD | Reviewers |
|--------|------|:---:|:---:|
| `develop` | Integration — every feature merges here first | Yes | 1 |
| `staging` | Pre-production mirror — curation testing | No | 1 |
| `main` | Production source — always deployable | No | 1 |

`staging` receives code only through the promotion flow of `rules/promotion.md`, never from a feature branch, and nothing is pushed to `main` directly. The reviewer count is one per branch when someone else can review, and zero when the maintainer works alone; the protection rule below says how each case is expressed.

```text
// ✅ All three exist, develop is the default, features land on develop
develop   staging   main        default: develop
// ❌ Only main exists, so production absorbs feature work directly
main                            default: main
```

## P0 — Protect all three branches with the same shape

All three require a pull request and passing CI. Dismissed stale reviews and last-push approval apply as soon as there is an approving reviewer, because there has to be an approval to dismiss or to renew. Force pushes and deletions are blocked, and administrators are included. What differs is strictness and allowed source: `develop` tolerates out-of-date branches, `staging` and `main` require up to date; `staging` accepts only `release/*`, and `main` only `release/*` and `hotfix/*`.

| Setting | `develop` | `staging` | `main` |
|---|---|---|---|
| PR and passing CI | required | required | required |
| Approving reviewers | 1 (0 if alone) | 1 (0 if alone) | 1 (0 if alone) |
| Dismiss stale, last push approval | yes | yes | yes |
| Branches up to date (strict) | no | yes | yes |
| Allowed source | any | `release/*` | `release/*`, `hotfix/*` |
| Force push, deletion | blocked | blocked | blocked |
| Include administrators | yes | yes | yes |

The check names are repo-specific: this skill requires that checks exist, not which ones. In a repository with a single maintainer, set `required_approving_review_count` to 0 and give that user a bypass with `users` filled and `teams` and `apps` empty: nobody else can approve, and a rule whose only satisfaction is being bypassed teaches everyone to bypass it. That is the normal shape for a solo repository, not a temporary exception — it changes the day a second person joins, which is also when `main` goes to two reviewers.

```text
// ✅ The allowance that makes solo work possible, mirrored on all three branches
"bypass_pull_request_allowances": { "users": ["<github-username>"], "teams": [], "apps": [] }
// ❌ Empty users: the solo admin cannot merge a single pull request
"bypass_pull_request_allowances": { "users": [], "teams": [], "apps": [] }
```

The hotfix path that reaches `main` without staging is owned by `rules/hotfix.md`.
