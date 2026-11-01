---
name: kickoff
description: "Trigger: kickoff, bootstrap, session start, start a task, take a ticket, new branch, github issue, arrancar sesión, empezar tarea, tomar un ticket. Sequences the task bootstrap: GitHub Project, issue readiness (project board, estimate, assignee), board status, branch named `feature/<issue-number>-<slug>`, ODD tracking. Nothing is implemented without an issue."
license: MIT
metadata:
  author: countergank
  version: "3.0.0"
---
## When to Apply

At session start or before the first git action of a concrete task.

A read-only request (explain, review, compare, propose) runs steps 1 and 2 only and stops: no branch, no issue change. If it is unclear whether the request changes code, ask one question and wait.

All `gh` commands run against the org: `--owner countergank`, `-R countergank/<repo>`.

## Step 1 — Locate the repo, its GitHub Project, and the affected area

Every repo has a homonymous **organization Project** (the board). Look it up by title:

```bash
gh project list --owner countergank --format json \
  | jq -r '.projects[] | select(.title=="<repo>") | .number, .id'
```

No homonymous board: stop and ask which project the work belongs to. Never invent one.

For the technical area, map it with CodeGraph (`init` when the index is missing); without CodeGraph, targeted reads.

## Step 2 — Pick the issue

1. If the request names a `#<number>` for this repo, that is the issue: go to step 3.
2. Read what was done last in the repo:

```bash
gh issue list -R countergank/<repo> --state closed --limit 10 \
  --json number,title,closedAt,labels
```

   Sort by `closedAt` and keep the last 3: they show the area and the sequence the person was working in.

3. Fetch the open candidates:

```bash
gh issue list -R countergank/<repo> --state open --limit 50 \
  --json number,title,labels,assignees
```

4. Read each candidate's board status with the project query in step 3, and drop what cannot be
   taken: `In Progress` or `In Review` owned by someone else, and anything blocked by an open issue
   (a `- [ ] #<number>` task in the body, or a sub-issue still open).
5. Among the rest, choose in this order:
   - **continuity** — the one that follows the topic of the last closed issue: same label/area,
     "part 2", or the follow-up the previous issue names in its body;
   - **priority** — a `priority:*` label if the team uses one, highest first;
   - **unblocking** — the one that enables the most open issues.
6. Present up to 3 candidates with a one-line reason each and recommend one. When one candidate
   is clearly first, say so and continue; when the tie persists, wait for confirmation.
7. No open issue: **nothing is implemented**. Offer to create it with `github-tickets` (title,
   per-type template, labels) and stop.

When the request already names the topic, filter candidates by title/body before ranking.

## Step 3 — Check that the issue is ready

`project` (on the board), `Estimate`, and `assignee` must all be filled before touching code.
Read the issue's board fields (`STATUS_FIELD_ID` and the item id come from the same query):

```bash
gh api graphql -f query='
query($login:String!,$num:Int!){
  organization(login:$login){ projectV2(number:$num){ items(first:100){ nodes{
    id content{ ... on Issue { number } }
    fieldValues(first:20){ nodes{
      ... on ProjectV2ItemFieldSingleSelectValue { name field{ ... on ProjectV2SingleSelectField { name } } }
      ... on ProjectV2ItemFieldNumberValue { number field{ ... on ProjectV2Field { name } } } } } } } } }' \
  -f login=countergank -F num=<BOARD_NUMBER> \
  --jq '.data.organization.projectV2.items.nodes[] | select(.content.number==<ISSUE_NUMBER>)'
```

| Missing | What to do |
|---|---|
| Not on the board | `gh project item-add <BOARD_NUMBER> --owner countergank --url <issue-url>` |
| `Estimate` | Propose a value on the team's scale with a one-line rationale, confirm it with the person, then write it: `gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> --field-id <ESTIMATE_FIELD_ID> --number <value>` (field id from `gh project field-list <BOARD_NUMBER> --owner countergank --format json`). |
| `assignee` | Ask who takes it and assign it: `gh issue edit <number> -R countergank/<repo> --add-assignee <login>`. Never invent one. |
| `Status` option ids unknown | Resolve them by name from `gh project field-list` (`Todo`, `In Progress`, `Done`). Never hardcode option ids: they are per-project values. |

## Step 4 — Move the issue to In Progress

Before the first edit the board status moves to **In Progress**:

```bash
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <IN_PROGRESS_OPTION_ID>
```

Check in the response (or re-run the step-3 query) that `Status` reads `In Progress`.

## Step 5 — Create the branch from the naming convention

GitHub does not propose a branch name. The convention is:

```
feature/<issue-number>-<short-slug>
```

- `<short-slug>`: 3–5 words from the issue title, kebab-case, lowercase, ASCII only
  (e.g. issue #262 "Exponer los KPIs de usuarios en un endpoint de métricas" →
  `feature/262-exponer-kpis-usuarios`).
- The number first keeps branches sorted by issue and makes `fixes #<number>` traceable.

```bash
BRANCH="feature/<number>-<short-slug>"

# clean tree and up-to-date base
git status --porcelain        # empty; if there are changes, stop (they would travel to the new branch)
git fetch origin --prune

# create on develop, WITHOUT an upstream
git switch -c "$BRANCH" --no-track origin/develop

# verify
git rev-parse --abbrev-ref HEAD   # prints exactly "$BRANCH"
git status -sb                    # no upstream: "## feature/<number>-..."
```

- `--no-track` is required: without it the new branch tracks `origin/develop` and a bare `push` would go to develop.
- Base: `origin/develop`, the one `git-environment-flow` defines. Never `main`, `staging`, or develop as the working branch.
- Branch already local: `git switch "$BRANCH"`. Only on the remote: `git switch --track "origin/$BRANCH"`.

**Before the first edit all three must hold: issue chosen and complete, board status `In Progress`, HEAD on the issue branch. If one fails, nothing is edited.**

## Step 6 — Implement

ODD (Organic Driven Development) is the workflow the gentle-ai harness injects into the session: authorize → explore → classify → track → implement → close. When the work spans sessions or has separate deliverables, tracking is one file per feature at the repo root:

```
odd/tasks/<feature>.md
```

With three sections, in this order:

- **Specs** — numbered `S#` requirements, quoting the person's exact sentences, never summarized.
- **Tasks** — one line per task: ID, the `S#` it covers, path, commit.
- **Log** — `L1` is the original request verbatim; corrections, evidence, and decisions are appended after it.

With Engram available the mirror is `odd/<feature>/tasks`. Without ODD or without `odd/`: a todo list and nothing else, never a new tree. Real example: `api-user/odd/tasks/267-auth-me.md`.

**You do not commit.** The commit is authorized separately, after showing the diff; the ODD file records the commit when the person authorizes it, not before.

## Step 7 — Leave the issue in the right state at every moment

| Moment | Board status | Who moves it |
|---|---|---|
| Work starts | `In Progress` | the agent, step 4 |
| PR opened | `In Review` | the agent, with `item-edit` (same command, `In Review` option) |
| PR merged | `Done` | the agent verifies, closes the issue, sets `Done` |
| Paused or abandoned | `Todo` + comment with where it stopped | the agent |

**Auto-close caveat:** `fixes #<number>` closes the issue only when the PR merges into the repo's
**default branch**. These repos merge PRs into `develop`, so after merging:

```bash
gh issue close <number> -R countergank/<repo>
gh project item-edit --project-id <PROJECT_ID> --id <ITEM_ID> \
  --field-id <STATUS_FIELD_ID> --single-select-option-id <DONE_OPTION_ID>
```

After opening the PR and after the merge, re-run the step-3 query and confirm the status.

## Step 8 — Report

One block: repo · issue (`#<number>` + URL) · estimate · assignee · board status · branch · base · commits over `origin/develop` (`git rev-list --count origin/develop..HEAD`).

With changes in the tree and no commit: show `git status --short` and `git diff --stat`, propose the message, and wait for authorization.
