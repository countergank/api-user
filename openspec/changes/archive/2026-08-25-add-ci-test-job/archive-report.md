# Archive Report — add-ci-test-job

**Archived**: 2026-08-25 (post-hoc / partial archive — user-authorized)
**Ticket**: COU-216 (Done)
**Artifact store mode**: hybrid (filesystem merge + archive; no Engram observation for this change — artifacts were openspec-only)

## Intent

PRs could pass CI with broken tests. This change adds a `test` job in a new GitHub Actions workflow (`npm ci` → `npm test` → `npm run test:e2e`) that fails PRs when tests break, with MongoDB 6 + Redis 7 service containers.

## Missing Artifacts (recorded, not blocking — user authorized)

| Artifact | Status |
|----------|--------|
| `proposal.md` | present |
| `tasks.md` | present |
| `design.md` | **missing** |
| `specs/` | **missing** (no delta specs) |
| `apply-progress` | **missing** |
| `verify-report.md` | **missing** |

- `tasks.md` has **all tasks unchecked** (`- [ ]`) — stale state; the work shipped (ticket Done) but `sdd-apply` never marked checkboxes. Left unreconciled per orchestrator instruction (post-hoc archive, record-don't-block).

## Spec Sync

**None.** The proposal declares a new capability `ci-test-workflow` but no delta spec folder was created, so no canonical spec was materialized. No `openspec/specs/` change.

## Archive Contents

- `proposal.md`
- `tasks.md`
- `archive-report.md` (this file)
