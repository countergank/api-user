# Archive Report: openspec-structure-sync-fix

## Change Metadata
| Field | Value |
|-------|-------|
| Change | openspec-structure-sync-fix |
| Linear | COU-119 |
| Branch | fix/openspec-structure-sync |
| Verdict | PASS |
| Archived | 2026-07-06 |
| Archive Path | `openspec/changes/archive/2026-07-06-openspec-structure-sync-fix/` |

## Problem Statement
The SDD sync workflow (`.github/workflows/sdd-sync.yml`) could not detect changes archived in the canonical structure (`openspec/changes/archive/YYYY-MM-DD-name/`), causing orphan GitHub issues to be created for already-archived changes. 13 legacy archives needed migration from old structure (`<type>/<change>/archive/`) to canonical structure. 5 orphan issues needed closure.

## Phase Summaries

### Phase 1: Exploration
- **Engram ID**: #1065
- **Finding**: Root cause was `find -type d -name archive` only matching dirs literally named "archive", not dated subdirs inside `archive/`. The sdd-archive skill always defined the new structure; old structure was legacy from before standardization.

### Phase 2: Proposal
- **Engram ID**: #1066
- **Scope**: Fix workflow archive detection, migrate 13 legacy archives, close 4+ orphan GitHub issues.

### Phase 3: Spec
- **Engram ID**: #1068
- **Domains**: workflow-sync (5 reqs), archive-migration (4 reqs), orphan-cleanup (2 reqs) = 11 total requirements.

### Phase 4: Design
- **Engram ID**: #1067
- **Key decisions**: (1) -not -path over -prune for readability, (2) date-pattern glob for new-structure detection, (3) tightened issue matching from contains() to in:title search, (4) shell script with git mv for migration, (5) dates derived from git log of archive creation.

### Phase 5: Tasks
- **Engram ID**: #1069
- **Breakdown**: 4 phases, 21 tasks total.

### Phase 6: Apply
- **Engram ID**: #1070
- **Commits**: 4 commits on fix/openspec-structure-sync
  1. `fix(ci): update sdd-sync workflow to detect new archive structure` (691d67a)
  2. `chore(openspec): migrate 13 legacy archives to canonical date-prefix structure` (ab4a19e)
  3. `fix(ci): exclude archive subtree from active change detection` (e4e7e9a)
  4. `chore(scripts): remove one-time migration script` (19701ad)
- **Deviations**: Added base-name matching in skip logic; closed issue #174 in addition to 4 specified orphans.

### Phase 7: Verify
- **Engram ID**: #1071
- **Verdict**: PASS
- **Tests**: 324/324 passed (38 suites)
- **Spec compliance**: 11/11 requirements COMPLIANT
- **Tasks**: 21/21 complete
- **Critical issues**: None

## Metrics
| Metric | Value |
|--------|-------|
| Requirements | 11/11 COMPLIANT |
| Tasks | 21/21 COMPLETE |
| Tests | 324/324 PASS |
| Commits | 4 |
| Legacy archives migrated | 13 (12 moved + 1 collision skip) |
| Orphan issues closed | 5 (#174, #244, #246, #254, #255) |
| New archive dirs | 19 total |
| Critical issues | 0 |

## Specs Synced
| Domain | Action | Details |
|--------|--------|---------|
| workflow-sync | Created | 5 requirements (WF-01 to WF-05) — archive detection, skip logic, issue matching |
| archive-migration | Created | 4 requirements (MIG-01 to MIG-04) — legacy migration, date derivation, file preservation, cleanup |
| orphan-cleanup | Created | 2 requirements (ORP-01, ORP-02) — close orphans, prevent future |

## Archive Contents
- proposal.md ✅
- specs/workflow-sync/spec.md ✅
- specs/archive-migration/spec.md ✅
- specs/orphan-cleanup/spec.md ✅
- design.md ✅
- tasks.md ✅ (21/21 tasks complete — stale checkboxes reconciled at archive time)
- verify-report.md ✅

## Stale Checkbox Reconciliation
The tasks.md file on the filesystem had all 21 tasks as unchecked (`- [ ]`) despite apply-progress and verify-report confirming 21/21 complete. Reconciled at archive time based on:
- apply-progress (Engram #1070): 21/21 complete with commit evidence
- verify-report (Engram #1071): 21/21 complete with spec compliance matrix
Reason: sdd-apply phase did not persist checkbox state to the filesystem tasks.md. All tasks verified complete via git commits and test evidence.

## Lessons Learned
1. **Workflow archive detection must match the canonical structure**: `find -type d -name archive` is insufficient when archives use date-prefixed directories under `archive/`.
2. **Dual-structure detection during migration**: Both legacy and new archive structures must be recognized simultaneously during the migration window.
3. **Base-name matching for skip logic**: Legacy change directories may retain proposal.md files after archive/ subdir migration, requiring base-name matching in addition to path-based detection.
4. **Task checkbox persistence**: The apply phase must mark completed tasks in the persisted tasks artifact (filesystem tasks.md or Engram observation), not just in apply-progress. Stale checkboxes block archive without reconciliation.
5. **One-time migration scripts should be deleted**: After use, migration scripts should be removed to avoid confusion.

## Source of Truth Updated
The following specs now reflect the new behavior:
- `openspec/specs/workflow-sync/spec.md`
- `openspec/specs/archive-migration/spec.md`
- `openspec/specs/orphan-cleanup/spec.md`

## SDD Cycle Complete
The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
