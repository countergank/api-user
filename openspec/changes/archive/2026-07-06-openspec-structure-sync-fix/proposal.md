# Proposal: Fix openspec archive structure detection in SDD sync workflow

## Intent

The SDD sync workflow (`.github/workflows/sdd-sync.yml`) cannot detect the canonical archive structure (`openspec/changes/archive/<YYYY-MM-DD>-<change>/`) defined by the sdd-archive skill. This causes:
1. Archived changes to be treated as active → duplicate orphan GitHub issues created on every push
2. The "close archived issues" step finds nothing to close → issues #244, #246, #254, #255 remain open

## Scope

### In Scope
- Fix workflow archive detection to handle `openspec/changes/archive/<date>-<name>/` pattern
- Fix active-change detection to exclude archived changes (prevent orphan issue creation)
- Migrate 13 old-structure archives (`<type>/<change>/archive/`) to new structure
- Close 4 orphan GitHub issues with `archived` label

### Out of Scope
- Changing sdd-archive skill (it defines the correct structure)
- Changing openspec/config.yaml
- Redesigning the workflow architecture

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- None (this is a CI workflow fix, not a spec-level behavior change)

## Approach

**Phase 1 — Workflow YAML fix** (`.github/workflows/sdd-sync.yml`):
- Add second `find` command to detect `openspec/changes/archive/????-??-??-*` dated subdirs
- Add `-prune` to active-change `find` to prevent recursion into `archive/` dirs
- Both fixes maintain backward compatibility with old structure during migration

**Phase 2 — Archive migration** (git mv, no content changes):
- Move 13 old-structure dirs to `openspec/changes/archive/<date>-<name>/`
- Dates sourced from original merge dates or proposal content

**Phase 3 — Orphan cleanup**:
- Close GitHub issues #244, #246, #254, #255 with `archived` label

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/sdd-sync.yml` | Modified | Archive detection + active-change exclusion logic |
| `openspec/changes/archive/` | New dirs | 13 migrated archives (git mv) |
| `openspec/changes/{feature,bugfix,refactor}/*/archive/` | Removed | Old-structure dirs removed after migration |
| GitHub #244, #246, #254, #255 | Closed | Orphan issues from undetected archives |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Workflow regex misses edge case | Low | Test with `workflow_dispatch` on a branch first |
| Migration date conflicts | Low | Each archive gets unique date-name prefix |
| Issue title matching too broad | Medium | Close step uses exact change name matching |

## Rollback Plan

1. Revert the workflow YAML commit — restores previous detection behavior
2. `git revert` the migration commit — old-structure dirs restored via `git mv` reversal
3. Re-open orphan issues if needed (GitHub API preserves history)

## Dependencies

- None

## Success Criteria

- [ ] Workflow detects all archives in new structure (`archive/<date>-<name>/`)
- [ ] Workflow excludes archived changes from active-change detection (no new orphan issues)
- [ ] All 13 old-structure archives migrated to new structure
- [ ] Orphan issues #244, #246, #254, #255 closed with `archived` label
- [ ] `workflow_dispatch` run produces no duplicate issues

## SDD Task Breakdown Forecast

~3 phases, ~10-12 tasks, ~200-300 lines changed.
