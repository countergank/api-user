# Archive Report — cou-144-migrate-config-consumers

**Archived**: 2026-08-25 (post-hoc / partial archive — user-authorized)
**Ticket**: COU-144 (Done)
**Artifact store mode**: hybrid

## Intent

Replace direct `process.env` reads in email/throttle consumers with `ParameterService`: register 13 new parameter definitions (email + throttle), refactor email providers to DI config, and introduce `DynamicThrottlerGuard` with a sync in-memory cache, removing static `@Throttle()` decorators.

## Missing Artifacts (recorded, not blocking — user authorized)

| Artifact | Status |
|----------|--------|
| `proposal.md` | present |
| `design.md` | present |
| `specs/` | present (3 deltas) |
| `tasks.md` | present |
| `apply-progress` | **missing** |
| `verify-report.md` | **missing** |

- `tasks.md` uses `**DONE**` markers (not `[x]` checkboxes); all 5 tasks marked DONE, no unchecked `- [ ]` tasks.

## Spec Sync (3 new canonical specs, mechanical copy — byte-identical)

| Delta domain | Action |
|--------------|--------|
| `email-refactor` | Created `openspec/specs/email-refactor/spec.md` |
| `parameter-definitions` | Created `openspec/specs/parameter-definitions/spec.md` |
| `throttle-guard` | Created `openspec/specs/throttle-guard/spec.md` |

## Archive Contents

- `proposal.md`
- `design.md`
- `specs/` (email-refactor, parameter-definitions, throttle-guard)
- `tasks.md`
- `archive-report.md` (this file)
