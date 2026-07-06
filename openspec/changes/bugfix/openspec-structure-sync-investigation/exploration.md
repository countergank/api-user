# Exploration: OpenSpec Directory Structure Drift & SDD Sync Workflow Bug

## Current State

The `openspec/changes/` directory contains TWO different archive structures coexisting:

1. **Old structure** (14 dirs): `openspec/changes/<type>/<change>/archive/` — each change has its own `archive/` subdirectory
2. **New structure** (7 dirs): `openspec/changes/archive/<YYYY-MM-DD>-<change>/` — all archived changes live under a shared `archive/` container with date-prefixed names

The SDD sync workflow (`.github/workflows/sdd-sync.yml`) only detects changes archived in the OLD structure. The 7 changes in the NEW structure are invisible to the "Close archived issues" step, causing orphan GitHub issues that never get closed.

## Affected Areas

- `.github/workflows/sdd-sync.yml` — lines 84-93: archive detection uses `find -type d -name archive`, which only finds directories literally named "archive"
- `.github/workflows/sdd-sync.yml` — lines 150-197: "Close archived issues" step iterates over `ARCHIVE_CHANGES` which never includes new-structure archives
- `skills/sdd-archive/SKILL.md` — lines 137-139: defines the NEW structure as the canonical archive path
- `skills/_shared/openspec-convention.md` — lines 12-13, 114-118: defines the NEW structure as the convention
- `openspec/changes/archive/` — contains 7 dated subdirectories that are never detected

## Directory Structure Comparison

| Change | Date | Structure | Workflow Detected? | Orphan Issue? |
|--------|------|-----------|-------------------|---------------|
| bugfix/sdd-sync-workflow-fix | 2026-04-21 | OLD (`bugfix/.../archive/`) | YES | No |
| feature/add-opencode-openspec-integration | ~2026-04 | OLD | YES | No |
| feature/admin-crud | ~2026-04 | OLD | YES | No |
| feature/admin-user-management-and-data-security | ~2026-03 | OLD | YES | No |
| feature/api-documentation | ~2026-03 | OLD | YES | No |
| feature/docker-images-github | ~2026-03 | OLD | YES | No |
| feature/email-service | ~2026-03 | OLD | YES | No |
| feature/feature-swagger-skill | ~2026-03 | OLD | YES | No |
| feature/issue-automation | ~2026-03 | OLD | YES | No |
| feature/rate-limiting-account-lockout | ~2026-04 | OLD | YES | No |
| feature/roles-and-permissions | ~2026-04 | OLD | YES | No |
| feature/stabilize-api-user | ~2026-03 | OLD | YES | No |
| refactor/swagger-docs | ~2026-03 | OLD | YES | No |
| 2026-04-27-fortaleza-password | 2026-04-27 | NEW (`archive/date-name/`) | **NO** | **YES** (#244) |
| 2026-05-07-feature-internacionalizacion | 2026-05-07 | NEW | **NO** | **YES** (#246) |
| 2026-05-13-feature-rate-limiting-account-lockout | 2026-05-13 | NEW | **NO** | **YES** |
| 2026-05-14-admin-crud | 2026-05-14 | NEW | **NO** | **YES** |
| 2026-05-22-audit-logging | 2026-05-22 | NEW | **NO** | **YES** (#254) |
| 2026-07-03-controller-decorators-docker | 2026-07-03 | NEW | **NO** | **YES** (#255) |
| 2026-07-03-nestjs-p0-security-health | 2026-07-03 | NEW | **NO** | **YES** |

## Source of Truth Analysis

| Source | Defines Structure? | Which Structure? | Notes |
|--------|-------------------|------------------|-------|
| `sdd-archive/SKILL.md` (Step 3, lines 137-139) | **YES** | NEW | `openspec/changes/{change-name}/ → openspec/changes/archive/YYYY-MM-DD-{change-name}/` |
| `_shared/openspec-convention.md` (lines 12-13, 114-118) | **YES** | NEW | `archive/ ← Completed changes (YYYY-MM-DD-{change-name}/)` |
| `openspec/config.yaml` | NO | — | No archive structure defined |
| `sdd-init/SKILL.md` | NO | — | Only bootstraps directories, doesn't define archive layout |
| `sdd-propose/SKILL.md` | NO | — | Creates `openspec/changes/{change-name}/`, no archive path |
| `gentle-ai sdd-status` | NO | — | Reports `planningHome.path: openspec`, no archive expectations |
| **Canonical answer** | | **NEW** | Both sdd-archive skill and openspec-convention define the NEW structure |

## Workflow Bug Analysis

### Exact failing lines

**Lines 84-93** (`Detect branch type and find changes` step):
```bash
for archive_dir in $(find openspec/changes -type d -name archive 2>/dev/null); do
  change_dir=$(dirname "$archive_dir")
  change_name=$(echo "$change_dir" | awk -F'openspec/changes/' '{print $2}')
```

**Why it fails:**
- `find -type d -name archive` matches directories whose NAME is literally "archive"
- For OLD structure: finds `openspec/changes/feature/admin-crud/archive` ✅ (dirname = `feature/admin-crud`)
- For NEW structure: finds `openspec/changes/archive` (the container dir itself) → change_name = "archive" (useless)
- The dated subdirs like `2026-07-03-nestjs-p0-security-health` are NOT named "archive", so they are NEVER found

**Lines 156-197** (`Close archived issues` step):
```bash
for change in $archive_changes; do
  change_name=$(echo "$change" | awk -F'/' '{print $NF}')
  # searches GitHub issues by change_name
```

**Why it fails:**
- Iterates over `ARCHIVE_CHANGES` which only contains old-structure paths
- New-structure archives never enter this loop
- Issues for new-structure changes are never found, never closed

### The `find` command that WOULD work for both structures:
```bash
# Find old structure: */archive/ directories
find openspec/changes -type d -name archive -mindepth 3 -maxdepth 3
# AND find new structure: archive/YYYY-MM-DD-*/ directories
find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d -name '????-??-??-*'
```

## Previous Fix Analysis

### What the `sdd-sync-workflow-fix` change (2026-04-21) fixed:
1. ✅ `GITHUB_ENV` → `GITHUB_OUTPUT` for variable passing
2. ✅ Detection logic: only find dirs with `proposal.md` (avoids template dirs)
3. ✅ Excluded `archive` and `refactor` from active change detection
4. ✅ Added `GH_TOKEN` to all steps using `gh` CLI
5. ✅ Made archive search recursive: `find openspec/changes -type d -name archive` (was `-maxdepth 1`)

### What it MISSED:
1. ❌ **Did NOT address the new `archive/<date>-<name>/` structure** — the recursive `find -name archive` still only finds dirs named "archive", not dated subdirs
2. ❌ The fix was designed for the OLD structure becoming recursive, not for a NEW structure being introduced
3. ❌ The workflow file WAS modified (commit `7d96c35`), but the modification only made the old detection work for nested old-structure archives, not for the new flat archive structure

### Root cause of the miss:
The fix was applied on 2026-04-21. The first new-structure archive (`2026-04-27-fortaleza-password`) was created 6 days later on 2026-04-27. The fix predated the structure change.

## Root Cause

**The sdd-archive skill was updated (or always defined) to use `openspec/changes/archive/YYYY-MM-DD-{change-name}/` as the canonical archive path. The workflow's archive detection logic was written for the OLD structure (`openspec/changes/<type>/<change>/archive/`) and was never updated to handle the NEW structure.**

The transition happened around late April 2026. The `sdd-sync-workflow-fix` (committed 2026-04-21) fixed workflow mechanics (GITHUB_OUTPUT, GH_TOKEN, proposal.md detection) but did NOT update archive detection because the new structure didn't exist yet. When the first new-structure archive was created on 2026-04-27, the workflow silently stopped detecting those archives.

## Recommendation Options

### Option A: Update workflow to support BOTH structures (backward compatible)
**Pros:** Safe, no migration needed, handles legacy archives gracefully
**Cons:** More complex detection logic, two code paths to maintain
**Effort:** Low (add one more `find` command to detect `archive/YYYY-MM-DD-*/`)
**Implementation:** Add a second loop in the "Detect branch type" step:
```bash
# Also detect new structure: archive/YYYY-MM-DD-*/
for new_archive in $(find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d -name '????-??-??-*' 2>/dev/null); do
  new_name=$(basename "$new_archive")
  archive_changes="$archive_changes archive/$new_name"
done
```

### Option B: Migrate old structure to new structure (standardize)
**Pros:** Single source of truth, cleaner directory layout, matches sdd-archive skill
**Cons:** Requires moving 14 directories, potential git history confusion
**Effort:** Medium (scripted move + PR)
**Implementation:** Move all `openspec/changes/<type>/<change>/` that have `archive/` subdirs to `openspec/changes/archive/<date>-<change>/`

### Option C: Update sdd-archive skill to use old structure (revert convention)
**Pros:** Workflow already works for old structure
**Cons:** Goes against openspec-convention.md, breaks the canonical directory layout, confusing for future agents
**Effort:** Low
**NOT RECOMMENDED** — the new structure is the canonical convention defined in multiple sources of truth.

### Recommended: Option A + Option B (phased)
1. **Immediate:** Implement Option A to stop creating new orphans
2. **Next cycle:** Implement Option B to clean up legacy archives

## Risks
- **Orphan accumulation:** Every new SDD cycle using the new structure creates another orphan issue
- **Issue matching ambiguity:** The workflow's `gh issue list --search` uses `contains("$change_name")` which can match unrelated issues (e.g., "admin-crud" matches both old and new structure)
- **Git history:** Moving old archives changes file paths, which may break links in past PRs/issues

## Ready for Proposal
**Yes** — the root cause is clear, the fix is straightforward, and the recommendation is Option A (immediate) + Option B (cleanup). The orchestrator should propose a change to fix the workflow archive detection.
