# Integration — Priority P1

Read this file when you create the branch for a ticket or write the pull request that closes it.

## P1 — Take `branchName` verbatim and close with `fixes COU-###`

This skill is the single source of the `COU-###` contract; `git-environment-flow` and `github-conventions` reference it and never restate it. The branch name is the ticket's `branchName` field exactly as Linear returned it, and the pull request description carries `fixes COU-###`, so a duplicate definition elsewhere is the definition that drifts.

1. **Branch** — the ticket's `branchName`, verbatim. Example: `feature/cou-262-corregir-los-codigos-de-estado-de-los-endpoints-de-accion-de`.
2. **Pull request** — `fixes COU-###` in the description. Example: `fixes COU-262`.
3. **Automatic states** — the team defines them in Linear (`start` → In Progress, `review` → In Review, `merge` → Done). The automation compares the branch name against `branchName`.

The name is generated, not authored: Linear truncates `branchName` at its maximum length, so a composed, shortened or "improved" name no longer matches and the automation stops moving the ticket. Never edit the string by hand, and use the same `COU-###` in the branch and in the pull request so the automation connects the two. Where the branch comes from and how it is created is `rules/branch.md` in `github-conventions`; where the pull request text goes is `rules/pr.md` in the same skill.

```text
// ✅ Verbatim branch, exact keyword, same ticket on both sides
Rama: feature/cou-262-corregir-los-codigos-de-estado-de-los-endpoints-de-accion-de
PR:   fixes COU-262
```

```text
// ❌ Composed branch, translated keyword, or a second definition of the contract
Rama: feat/COU-262-auth-action-status-codes
PR:   arregla COU-262
Otro skill que define `COU-###` por su cuenta.
```
