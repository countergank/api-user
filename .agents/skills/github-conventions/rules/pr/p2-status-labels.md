---
priority: P2
category: pr
---

# Use status labels to communicate PR state

**Do**: Apply status labels (`WIP`, `ready-for-review`, `blocked`, size labels) to communicate the current state of a PR at a glance.
**Avoid**: Leaving a PR in draft mode after it is ready, or requesting review on a PR that is still a work in progress.
**Reference**: [GitHub Draft Pull Requests](https://github.blog/changelog/2019-02-14-introducing-draft-pull-requests/)

## Status Labels

| Label | Meaning | When to Apply |
|-------|---------|---------------|
| `WIP` / `draft` | Work in progress — do not review yet | When the PR is opened but incomplete |
| `ready-for-review` | Ready for reviewer attention | When all self-review checklist items pass |
| `blocked` | Cannot proceed (waiting on dependency, decision, or external factor) | When something blocks merging |
| `needs-rebase` | Branch is behind `main` and has conflicts | When rebase is required before merge |

## Size Labels (optional)

| Label | Lines Changed |
|-------|---------------|
| `size/XS` | 0-9 |
| `size/S` | 10-29 |
| `size/M` | 30-99 |
| `size/L` | 100-499 |
| `size/XL` | 500-999 |
| `size/XXL` | 1000+ |

## Workflow

1. Open PR as **Draft** while working on it.
2. Apply `WIP` label (optional, GitHub Draft already signals this).
3. When ready, mark as **Ready for Review** and apply `ready-for-review`.
4. If something blocks progress, apply `blocked` and explain in a comment.
5. Remove `WIP` and `blocked` when resolved.

**Examples**:
```
✅ Good: PR opened as Draft → work completed → marked Ready for Review
         with clear description and passing CI.
❌ Bad:  PR opened as ready-for-review but description is empty,
         CI is failing, and author says "still working on it".
```
