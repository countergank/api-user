---
name: kickoff
description: "Trigger: kickoff, bootstrap, session start, start a task, new session, arrancar sesión, empezar tarea, bootstrap de sesión. Sequences the session bootstrap: CodeGraph context, Linear tickets of the repo's project, base branch, branch creation, ODD tracking — delegates every rule to git-environment-flow, github-conventions and linear-tickets."
license: MIT
metadata:
  author: countergank
  version: "1.1.0"
---
## When to Apply

Activate at session start or before the first git action of a task. Read-only requests (explain, review, compare, propose) skip steps 3-5: no branch, no tracking.

## Bootstrap Steps

1. **Context** — map the affected area with CodeGraph (`init` when the index is missing); without an area, take it from the ticket in step 2. No CodeGraph: targeted reads.
2. **Tickets** — query the open tickets of the project homonymous to this repo through the Linear GraphQL API, header `Authorization: $LINEAR_API_TOKEN`; read title, description and every acceptance criterion in full. No open ticket: work from the scope the request names and say so.
3. **Base branch** — take the target from `git-environment-flow`; when it disagrees with `github-conventions`, the target wins.
4. **Branch** — create it from the latest base with the `github-conventions` naming contract; a ticket slug follows the `linear-tickets` format.
5. **Tracking** — open the ODD tracking from gentle-ai (`odd/tasks/<feature>.md`) for work spanning sessions or separate deliverables; without ODD or `odd/`, the todo list only, never a new tree.

## Hard Rules

- Never push to the integration branches defined by `git-environment-flow`.
- Read `git-environment-flow` before any git action: branch, merge, tag or release.
- Push, pull request and merge are the person's decision; never execute them on your own.

## Ask Before Continuing

- More than one candidate ticket: list them by priority, recommend the highest-priority one whose scope matches the request with its reason, and ask to confirm.
- Open scope or product question: ask one focused question and stop until it is answered.

## Output Contract

Report one block: area mapped, chosen ticket with its reason, base branch, branch name, tracking state.

## Compatibility

Use together with `git-environment-flow`, `github-conventions` and `linear-tickets`: this skill orders their steps and restates none of their rules.
