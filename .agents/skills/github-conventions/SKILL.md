---
name: github-conventions
description: "Trigger: commits, PRs, branches, conventional commits, commit format, branch naming, PR template, changelog, mensajes de commit, nombres de rama, pull request, plantilla de PR. Authoritative GitHub conventions for agents and humans: commit types and subject rules, branch creation and lifecycle, and pull request titles, descriptions and issue linking. Úsala siempre que escribas un mensaje de commit, nombres una rama, abras un pull request o mantengas un CHANGELOG; léela antes de la primera acción de git para que el formato y el nombre de rama sean válidos desde el principio."
license: MIT
permissions:
  - read-files
  - write-files
metadata:
  author: countergank
  version: "2.1.0"
---

Git and GitHub conventions for this repository. Three domain files; each rule states one decision with one ✅/❌ pair. Read the file that matches the action you are about to take.

| File | Read it when | Why |
|------|--------------|-----|
| `rules/commit.md` | Writing any commit message | Eleven canonical types, imperative subject in 50 characters, body and footers, breaking changes, CHANGELOG sections |
| `rules/branch.md` | Creating, updating or cleaning up a branch | `feature/<number>-<slug>` for ticket branches, `type/description` without a ticket, `--no-track`, rebase, delete after merge |
| `rules/pr.md` | Opening or updating a pull request | Conventional title, the required template sections, issue and ticket linking |

## Assets

- `assets/COMMIT_TEMPLATE.txt` — subject, body and footer skeleton; start every message from it.
- `assets/PULL_REQUEST_TEMPLATE.md` — the sections a pull request must fill.

## Boundaries

- Which branch to target and how code is promoted between environments belongs to the `git-environment-flow` skill; this skill covers naming, commits and the pull request itself.
- The branch convention `feature/<number>-<slug>` and the `fixes #<number>` magic word belong to the `github-tickets` skill; this skill only says where the word goes.
