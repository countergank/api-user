# Tasks: openspec-structure-sync-fix

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~120-160 (YAML edits + migration script create/delete) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Workflow YAML fix + archive migration + orphan cleanup | PR 1 | All infra/workflow — single reviewable unit |

## Phase 1: Workflow YAML Fix

- [ ] 1.1 In `.github/workflows/sdd-sync.yml` line 68, add `-not -path 'openspec/changes/archive/*'` to the active-change `find` command (before `! -name "specs"`) to exclude archive subtree from active detection
- [ ] 1.2 In `.github/workflows/sdd-sync.yml` lines 83-93, replace archive detection block with dual detection: keep old-structure loop (`find -type d -name archive`), add new-structure loop (`find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d -name '????-??-??-*'`) emitting `archive/$change_name`
- [ ] 1.3 In `.github/workflows/sdd-sync.yml` line 166, tighten main issue search from `contains("$change_name")` to `gh issue list --search "[SDD] $change_name in:title" --state all --json number,title --jq '.[0].number'`
- [ ] 1.4 In `.github/workflows/sdd-sync.yml` line 181, tighten task issue search from `contains("$change_name")` to `gh issue list --search "[SDD-Task] $change_name in:title" --state all --json number,title --jq '.[].number'`
- [ ] 1.5 Verify locally: run `find openspec/changes -mindepth 1 -type d -not -path 'openspec/changes/archive/*' ! -name "specs" ! -name "archive" ! -name "refactor" -exec test -f {}/proposal.md \; -print` — confirm zero archived proposals in output
- [ ] 1.6 Verify locally: run `find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d -name '????-??-??-*'` — confirm all dated archive dirs found

## Phase 2: Archive Migration

- [ ] 2.1 Create `scripts/migrate-archives.sh` with the 13-entry `ARCHIVES` associative array (mapping old paths to `YYYY-MM-DD-name` targets), using `git mv` for each, with skip-if-exists guard
- [ ] 2.2 Derive dates for each legacy archive: run `git log --diff-filter=A --format=%ai -- openspec/changes/<type>/<name>/archive/` for each of the 13 dirs; use `completed.md` date if available, fallback to git log date
- [ ] 2.3 Run `bash scripts/migrate-archives.sh` from repo root; verify `git status` shows 13 `rename` operations with no content changes
- [ ] 2.4 Verify no legacy archive dirs remain: `find openspec/changes/feature openspec/changes/bugfix openspec/changes/refactor -type d -name archive` returns empty
- [ ] 2.5 Verify new-structure count: `find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d | wc -l` equals 19 (6 existing + 13 migrated)

## Phase 3: Orphan Issue Cleanup

- [ ] 3.1 Close GitHub issue #244: `gh issue close 244 --comment "Archived due to COU-119 workflow bug — archive detection failed for legacy structure." && gh issue edit 244 --add-label archived`
- [ ] 3.2 Close GitHub issue #246 with same comment and `archived` label
- [ ] 3.3 Close GitHub issue #254 with same comment and `archived` label
- [ ] 3.4 Close GitHub issue #255 with same comment and `archived` label
- [ ] 3.5 Verify all 4 issues are closed with `archived` label: `gh issue view <num> --json state,labels`

## Phase 4: Integration Verification & Cleanup

- [ ] 4.1 Run `npm test` — confirm no application code broke (this change is workflow-only, but verify)
- [ ] 4.2 Run `npx tsc --noEmit` if TypeScript project — confirm no type errors
- [ ] 4.3 Validate workflow YAML: `npx yaml-lint .github/workflows/sdd-sync.yml` or `act --list`
- [ ] 4.4 Delete `scripts/migrate-archives.sh` — one-time script, no longer needed
- [ ] 4.5 Verify openspec structure: all active changes have `proposal.md`, all archives are under `archive/YYYY-MM-DD-name/`, no orphan `archive/` dirs in type subdirs
