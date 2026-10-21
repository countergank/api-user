---
name: kickoff
description: "Trigger: kickoff, bootstrap, session start, start a task, take a ticket, new branch, arrancar sesión, empezar tarea, tomar un ticket. Sequences the task bootstrap: Linear project, ticket readiness (project, estimate, assignee), ticket state, branch named exactly as Linear proposes, ODD tracking. Nothing is implemented without a ticket."
license: MIT
metadata:
  author: countergank
  version: "2.0.0"
---
## When to Apply

At session start or before the first git action of a concrete task.

A read-only request (explain, review, compare, propose) runs steps 1 and 2 only and stops: no branch, no ticket change. If it is unclear whether the request changes code, ask one question and wait.

## Step 1 — Locate the repo, its Linear project, and the affected area

Every repo has a homonymous Linear project. Look it up by name:

```bash
curl -s https://api.linear.app/graphql \
  -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_TOKEN" \
  -d '{"query":"{ projects(filter:{name:{eq:\"<repo>\"}}){ nodes { id name state } } }"}'
```

No homonymous project: stop and ask which project the work belongs to. Never invent one.

For the technical area, map it with CodeGraph (`init` when the index is missing); without CodeGraph, targeted reads.

## Step 2 — Pick the ticket

1. If the request names a `COU-###`, that is the ticket: go to step 3.
2. Read what was done last in the project:

```graphql
{ issues(filter:{project:{name:{eq:"<repo>"}}, state:{type:{eq:"completed"}}},
          orderBy:updatedAt, first:10){
    nodes { identifier title completedAt labels{nodes{name}} } } }
```

   Sort the response by `completedAt` (the API cannot order by that field) and keep the last 3:
   they show the area and the sequence the person was working in.

3. Fetch the open candidates:

```graphql
{ issues(filter:{project:{name:{eq:"<repo>"}},
                  state:{type:{in:["backlog","unstarted","started"]}}}, first:50){
    nodes { identifier title description state{name} priority estimate assignee{name}
            branchName relations{nodes{type relatedIssue{identifier state{name}}}} } } }
```

4. Drop what cannot be taken: `In Progress` or `In Review` owned by someone else, and anything
   `blocked by` an open ticket.
5. Among the rest, choose in this order:
   - **continuity** — the one that follows the topic of the last completed ticket: same
     label/area, "part 2", or the follow-up the previous ticket names in its description;
   - **priority** — the highest one other than 0 (`Urgent` > `High` > `Medium` > `Low`);
   - **unblocking** — the one that enables the most open tickets.
6. Present up to 3 candidates with a one-line reason each and recommend one. When one candidate
   is clearly first, say so and continue; when the tie persists, wait for confirmation.
7. No open ticket: **nothing is implemented**. Offer to create it with `linear-tickets` (title,
   per-type template, labels) and stop.

When the request already names the topic, filter candidates by title/description before ranking.

## Step 3 — Check that the ticket is ready

`project`, `estimate`, and `assignee` must all be filled before touching code.

| Missing | What to do |
|---|---|
| `project` | Assign the project from step 1 (`issueUpdate` with `projectId`). |
| `estimate` | Propose a value on the team's scale with a one-line rationale, confirm it with the person, then write it. The scale comes from `issueEstimationType`; when it returns `notUsed`, stop and ask to enable estimates in Linear (Settings → Team → Estimates). |
| `assignee` | Ask who takes it and assign it (`assigneeId`). Never invent one. |
| `branchName` empty | Stop: the ticket cannot produce a branch; check the team identifier. |

```graphql
mutation($id:String!,$input:IssueUpdateInput!){
  issueUpdate(id:$id, input:$input){
    success issue{ identifier project{name} estimate assignee{name} } } }
```

## Step 4 — Move the ticket to In Progress

Before the first edit the ticket moves to **In Progress**. The `stateId` is resolved by name among the ticket's team states, never hardcoded:

```graphql
{ issue(id:"COU-###"){ team { key issueEstimationType
    states{ nodes { id name type } } } } }
```

```graphql
mutation($id:String!,$stateId:String!){
  issueUpdate(id:$id, input:{stateId:$stateId}){
    success issue{ identifier state{name} } } }
```

Check in the response that it stayed in `In Progress`.

## Step 5 — Create the branch from Linear's name

The branch is the ticket's `branchName` field. Linear truncates it at its maximum length, so a name assembled by hand no longer matches and the automation does not move the ticket.

```bash
# 1. capture the exact name (never retype it)
BRANCH=$(curl -s https://api.linear.app/graphql \
  -H "Content-Type: application/json" -H "Authorization: $LINEAR_API_TOKEN" \
  -d '{"query":"{ issue(id:\"COU-###\"){ branchName } }"}' | jq -r '.data.issue.branchName')

# 2. clean tree and up-to-date base
git status --porcelain        # empty; if there are changes, stop (they would travel to the new branch)
git fetch origin --prune

# 3. create on develop, WITHOUT an upstream
git switch -c "$BRANCH" --no-track origin/develop

# 4. verify
git rev-parse --abbrev-ref HEAD   # prints exactly "$BRANCH"
git status -sb                    # no upstream: "## feature/cou-###-..."
```

- `--no-track` is required: without it the new branch tracks `origin/develop` and a bare `push` would go to develop.
- Base: `origin/develop`, the one `git-environment-flow` defines. Never `main`, `staging`, or develop as the working branch.
- Branch already local: `git switch "$BRANCH"`. Only on the remote: `git switch --track "origin/$BRANCH"`.

**Before the first edit all three must hold: ticket chosen and complete, state `In Progress`, HEAD on the ticket branch. If one fails, nothing is edited.**

## Step 6 — Implement

ODD (Organic Driven Development) is the workflow the gentle-ai harness injects into the session: authorize → explore → classify → track → implement → close. When the work spans sessions or has separate deliverables, tracking is one file per feature at the repo root:

```
odd/tasks/<feature>.md
```

With three sections, in this order:

- **Specs** — numbered `S#` requirements, quoting the person's exact sentences, never summarized.
- **Tasks** — one line per task: ID, the `S#` it covers, path, commit.
- **Log** — `L1` is the original request verbatim; corrections, evidence, and decisions are appended after it.

With Engram available the mirror is `odd/<feature>/tasks`. Without ODD or without `odd/`: a todo list and nothing else, never a new tree. Real example: `api-user/odd/tasks/cou-267-auth-me.md`.

**You do not commit.** The commit is authorized separately, after showing the diff; the ODD file records the commit when the person authorizes it, not before.

## Step 7 — Leave the ticket in the right state at every moment

| Moment | State | Who moves it |
|---|---|---|
| Work starts | `In Progress` | the agent, step 4 |
| PR opened | `In Review` | Linear automation (`review` event); the agent verifies and corrects |
| PR merged | `Done` | the automation, through the PR's `fixes COU-###`; the agent verifies |
| Paused or abandoned | `Todo` + comment with where it stopped | the agent |

After opening the PR and after the merge, read the ticket and confirm the state. When the automation did not run (for example, the PR carries no `fixes COU-###`), move it yourself with the `stateId` from step 4 and comment why.

## Step 8 — Report

One block: project · ticket (`COU-###` + URL) · estimate · assignee · current state · branch · base · commits over `origin/develop` (`git rev-list --count origin/develop..HEAD`).

With changes in the tree and no commit: show `git status --short` and `git diff --stat`, propose the message, and wait for authorization.
