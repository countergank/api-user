---
name: git-environment-flow
description: "Trigger: environment, branch flow, staging, release branch, hotfix, promotion, deploy tracking, environment branches, develop, backmerge, rama de release, promover a producción, hotfix en producción. Org-wide Git environment model for agents and humans: the three permanent branches and their protection, the promotion chain from develop to staging to main, the hotfix path that skips curation but never review, and the release branch and tag lifecycle driven by assets/release.sh. Úsala siempre que decidas a qué rama apunta un cambio, cortes un release, apliques un hotfix o promuevas código entre entornos; léela antes de la primera acción de git que cruce un entorno."
license: MIT
metadata:
  author: countergank
  version: "2.0.0"
---

Org-wide environment model for this organization. Four domain files; each rule states one decision with one ✅/❌ pair. Read the file that matches the decision you are about to take.

| File | Read it when | Why |
|------|--------------|-----|
| `rules/environment.md` | Creating a repository or configuring protection | The three permanent branches, `develop` as default, and the protection matrix that keeps each one honest |
| `rules/promotion.md` | Deciding which branch a change targets | Left-to-right promotion, the release branch as the only path to production, and the mandatory backmerge |
| `rules/hotfix.md` | Production is broken and cannot wait | Hotfix from `main`, annotated patch tag, backmerge, and the single owner of what a hotfix skips |
| `rules/release.md` | Bumping the version or cutting a release | `assets/release.sh` as the whole procedure, plus the `release/x.y.z` and `vX.Y.Z(-rcN)` lifecycle |

## Release automation

`assets/release.sh` ships the version bump, the changelog section and the annotated tag. Run it; `rules/release.md` states the contract and the flags.

## Boundaries

- Branch naming without a ticket (`feat/`, `fix/`, `hotfix/`), commit format and the pull request template belong to `github-conventions`; this skill decides which branch to target and how code crosses environments.
- Ticket branches belong to the `github-tickets` convention: `feature/<number>-<slug>`, closed with `fixes #<number>`; `kickoff` creates the branch on top of `develop`.
- A hotfix still needs review: skipping the staging curation path is not skipping the approval on `main`.
