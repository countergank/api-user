---
name: github-tickets
description: "Trigger: github, issue, issues, alta de issues, crear issue, ticket, tarea, issue de GitHub, estimación, labels de issue. Organizational standard for authoring and linking GitHub issues: title, description, labels, and the mandatory project board, Estimate and assignee fields. Úsala siempre que crees, edites o revises un issue de GitHub, cuando nombres la rama de un issue `feature/<number>-<slug>` o cuando escribas el `fixes #<number>` de un pull request; léela antes de tocar el board para que el issue se pueda entregar sin preguntas."
license: MIT
metadata:
  author: countergank
  version: "3.0.0"
---

GitHub issue standard for agents and humans. Five domain files; each rule states one decision with one ✅/❌ pair. Read the one that matches what you are about to write.

| File | Read it when | Why |
|------|--------------|-----|
| `rules/title.md` | Writing a title | `[Verb] [What] [Context]`, verb first, unique at a glance |
| `rules/description.md` | Writing a description | Context → Scope → Acceptance criteria, verifiable bullets |
| `rules/labels.md` | Labelling a ticket | One type and one component, singular, in English |
| `rules/language.md` | Choosing a field's language | Content in the team language, tooling in English |
| `rules/integration.md` | Naming the branch, linking the PR | `feature/<number>-<slug>`, `fixes #<number>`; the single source |
| `assets/templates/` | Starting a ticket | One template per ticket type, listed in the gates below |
| `assets/ISSUE_TEMPLATE/` | Installing GitHub issue templates in a repo | The same four types as native templates, plus `config.yml` |
| `references/` | Checking the method | The GitHub method summary and five sample tickets |

## Decision gates

| Situation | Template | Label |
|-----------|----------|-------|
| Bug | `assets/templates/bug.md` — steps, expected vs actual, impact, environment | `bug` |
| Feature | `assets/templates/feature.md` — goal, non-goals, criteria, links | `feature` |
| Investigation | `assets/templates/spike.md` — the deliverable to investigate | `spike` |
| Maintenance | `assets/templates/chore.md` — what is maintained | `chore` |

Pick the template by the kind of work. The bug template carries reproduction steps because a bug without them cannot be reproduced; a spike and a chore are minimal on purpose, and ceremony there costs more than it buys.

## GitHub issue templates

GitHub supports native issue templates per repository: Markdown files with YAML frontmatter (`name`, `about`, `labels`) under `.github/ISSUE_TEMPLATE/`, plus a `config.yml` that turns blank issues off. This skill ships the same four types as native templates in `assets/ISSUE_TEMPLATE/` — `bug.md`, `feature.md`, `spike.md`, `chore.md` and `config.yml`.

- **Install**: copy the five files into the consuming repo's `.github/ISSUE_TEMPLATE/`. They carry no content the repo templates above do not: one source, two renderings.
- **Use**: on the web UI, GitHub offers the four templates on the *New issue* page; on the CLI, `gh issue create --template "Bug report" -R countergank/<repo>`. The template pre-fills the body and applies the type label; the title stays author-written so `rules/title.md` still applies.
- **Prerequisite**: a template's `labels` must already exist in the repo (`bug`, `feature`, `spike`, `chore`); create any missing one with `gh label create` before installing, or the template fails on submit.
- **Blank issues stay off** (`config.yml`): every issue enters through a type, so the gates below hold by construction.

Every issue that will be implemented also carries **project board**, **Estimate** and **assignee** as GitHub fields — the issue lives in the repo, and the homonymous organization Project carries its `Status`; `kickoff` verifies them before touching code, and the description never repeats them in prose.
