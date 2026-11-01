# Integration — Priority P1

Read this file when you create the branch for an issue or write the pull request that closes it.

## P1 — Name the branch `feature/<number>-<slug>` and close with `fixes #<number>`

This skill is the single source of the branch convention; `git-environment-flow` and `github-conventions` reference it and never restate it. The branch is `feature/<issue-number>-<short-slug>` — 3–5 words from the issue title, kebab-case, lowercase, ASCII only — and the pull request description carries `fixes #<number>`, so a duplicate definition elsewhere is the definition that drifts.

1. **Branch** — `feature/<number>-<short-slug>`, from the issue number and title. Example: `feature/262-exponer-kpis-usuarios`.
2. **Pull request** — `fixes #<number>` in the description, one keyword line per issue. Example: `fixes #262`.
3. **Board status** — the homonymous organization Project carries the issue's `Status` (`Todo`, `In Progress`, `In Review`, `Done`). `kickoff` moves it; there is no automatic transition from a PR event, and **`fixes #<number>` closes the issue only when the PR merges into the repo's default branch** — these repos merge into `develop`, so after merge the agent closes the issue (`gh issue close`) and sets `Status: Done`.

The number comes first so branches sort by issue and the PR keyword is traceable at a glance. Compose the slug from the title, never abbreviate the number, and use the same `#<number>` in the branch and in the pull request. Where the branch is created is `rules/branch.md` in `github-conventions`; where the pull request text goes is `rules/pr.md` in the same skill.

```text
// ✅ Convention branch, exact keyword, same issue on both sides
Rama: feature/262-exponer-kpis-usuarios
PR:   fixes #262
```

```text
// ❌ Composed number, translated keyword, or a second definition of the contract
Rama: feat/#262-auth-status-codes
PR:   arregla #262
Otro skill que define la convención de rama por su cuenta.
```
