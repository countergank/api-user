---
name: linear-tickets
description: "Trigger: linear, tickets, issues, alta de tickets, crear ticket, tarea, ticket Linear, estimación, labels de ticket. Organizational standard for authoring and linking Linear tickets: title, description, labels, and the mandatory project, estimate and assignee fields. Úsala siempre que crees, edites o revises un ticket de Linear, cuando nombres la rama de un ticket `COU-###` o cuando escribas el `fixes COU-###` de un pull request; léela antes de tocar el board para que el ticket se pueda entregar sin preguntas."
license: MIT
metadata:
  author: countergank
  version: "2.0.0"
---

Linear ticket standard for agents and humans. Five domain files; each rule states one decision with one ✅/❌ pair. Read the one that matches what you are about to write.

| File | Read it when | Why |
|------|--------------|-----|
| `rules/title.md` | Writing a title | `[Verb] [What] [Context]`, verb first, unique at a glance |
| `rules/description.md` | Writing a description | Context → Scope → Acceptance criteria, verifiable bullets |
| `rules/labels.md` | Labelling a ticket | One type and one component, singular, in English |
| `rules/language.md` | Choosing a field's language | Content in the team language, tooling in English |
| `rules/integration.md` | Naming the branch, linking the PR | `branchName` verbatim, `fixes COU-###`; the single source |
| `assets/templates/` | Starting a ticket | One template per ticket type, listed in the gates below |
| `references/` | Checking the method | The Linear method summary and five sample tickets |

## Decision gates

| Situation | Template | Label |
|-----------|----------|-------|
| Bug | `assets/templates/bug.md` — steps, expected vs actual, impact, environment | `bug` |
| Feature | `assets/templates/feature.md` — goal, non-goals, criteria, links | `feature` |
| Investigation | `assets/templates/spike.md` — the deliverable to investigate | `spike` |
| Maintenance | `assets/templates/chore.md` — what is maintained | `chore` |

Pick the template by the kind of work. The bug template carries reproduction steps because a bug without them cannot be reproduced; a spike and a chore are minimal on purpose, and ceremony there costs more than it buys.

Every ticket that will be implemented also carries **project**, **estimate** and **assignee** as Linear fields: `kickoff` verifies them before touching code, and the description never repeats them in prose.
