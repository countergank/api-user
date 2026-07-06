# Design: Fix openspec archive structure detection in SDD sync workflow

## Technical Approach

Fix the SDD sync workflow's archive detection to recognize the canonical `openspec/changes/archive/<YYYY-MM-DD>-<name>/` structure (defined by sdd-archive skill), exclude archived changes from active-change detection, migrate 13 legacy archives, and close 4 orphan GitHub issues.

The root cause: `find -type d -name archive` matches `openspec/changes/archive` (the container) but the awk extraction produces `archive` as the change name — not the dated subdirs inside it. Meanwhile, the active-change `find` recurses into `archive/` and finds `proposal.md` files from archived changes, creating duplicate issues.

## Architecture Decisions

### Decision: Archive subtree exclusion strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `-not -path '*/archive/*'` | Readable, easy to debug; slightly slower on huge trees | **Chosen** |
| `-prune` | More efficient; harder to read/debug, easy to get wrong | Rejected |
| `-not -path 'openspec/changes/archive/*'` | Most specific; breaks if archive dir moves | Rejected |

**Rationale**: The workflow runs on a checkout of a single repo with ~30 change dirs. Performance difference is negligible. Readability matters more — the next person debugging this needs to understand it at a glance.

### Decision: New-structure archive detection pattern

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `-mindepth 1 -maxdepth 1 -type d` | Catches any subdir; may match non-archive dirs (e.g. `specs/`) | Rejected |
| `-mindepth 1 -maxdepth 1 -type d -name '????-??-??-*'` | Only matches dated entries; precise, self-documenting | **Chosen** |

**Rationale**: The canonical structure uses `YYYY-MM-DD-name` format. The glob pattern `????-??-??-*` is a safe filter that won't match accidental dirs. If the convention changes, this filter changes with it.

### Decision: Issue title matching precision

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `contains("$change_name")` (current) | Too loose: "admin" matches "admin-crud", "feature-admin" | Rejected |
| `contains("[SDD] $change_name")` or `contains("[SDD-Task] $change_name")` | Tighter but still substring | **Chosen** |
| Exact title match via `--search "in:title"` | Most precise; may miss issues with slightly different titles | Future improvement |

**Rationale**: The current `contains("$change_name")` on ANY `[SDD]` issue is dangerous. Tightening to `contains("[SDD] $change_name")` reduces false positives while still catching title variations like `[SDD] feature/admin-crud`.

### Decision: Migration approach

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Shell script with `git mv` | Repeatable, auditable, preserves history | **Chosen** |
| Manual `git mv` commands | Error-prone, not reproducible | Rejected |
| Python script | Overkill for 13 moves; adds dependency | Rejected |

**Rationale**: A shell script is simple enough to review, uses `git mv` for history preservation, and can be run once then deleted.

### Decision: Date derivation for migrated archives

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Git log: first commit that created the archive dir | Accurate, automated | **Chosen** |
| Manual lookup from proposal content | Slow, error-prone | Rejected |
| Use today's date | Loses historical context | Rejected |

**Rationale**: `git log --diff-filter=A --format=%ai -- openspec/changes/<type>/<name>/archive/` gives the date the archive was created. This is the most reliable automated source.

## Data Flow

```
Push/PR affecting openspec/changes/**
         │
         ▼
  ┌─────────────────────┐
  │  Detect branch type  │
  └─────────┬───────────┘
            │
            ▼
  ┌─────────────────────────────────────────┐
  │  Find active changes (proposal.md)       │
  │  EXCLUDE: openspec/changes/archive/*     │  ← NEW: -not -path filter
  │  EXCLUDE: -name "archive" dirs           │  ← Existing
  └─────────┬───────────────────────────────┘
            │
            ▼
  ┌─────────────────────────────────────────┐
  │  Find archived changes                   │
  │  1. Old: find -type d -name archive      │  ← Existing (backward compat)
  │  2. NEW: find archive/????-??-??-*       │  ← Canonical structure
  └─────────┬───────────────────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
  ┌──────┐   ┌─────────────┐
  │Create│   │Close archived│
  │issues│   │issues        │
  └──────┘   └─────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/sdd-sync.yml` | Modify | Fix archive detection (2 steps), tighten issue matching |
| `scripts/migrate-archives.sh` | Create | One-time migration script for 13 legacy archives |
| `openspec/changes/archive/2026-*-*/` | Create (13 dirs) | Migrated archives from old structure |
| `openspec/changes/feature/*/archive/` | Delete (12 dirs) | Old-structure archive dirs after migration |
| `openspec/changes/bugfix/sdd-sync-workflow-fix/archive/` | Delete | Old-structure archive after migration |
| `openspec/changes/refactor/swagger-docs/archive/` | Delete | Old-structure archive after migration |
| `scripts/migrate-archives.sh` | Delete | Remove after migration is complete (separate commit) |

## Interfaces / Contracts

### ARCHIVE_CHANGES output format

The `ARCHIVE_CHANGES` step output must contain both old and new structure paths:

```
# Old structure: type/change (e.g., feature/admin-crud)
# New structure: archive/YYYY-MM-DD-name (e.g., archive/2026-05-14-admin-crud)
```

The close job handles both formats because it extracts `change_name=$(echo "$change" | awk -F'/' '{print $NF}')` — the last path component works for both.

### Workflow step changes (exact bash)

#### Step: "Detect branch type and find changes" — active change detection

**Replace lines 67-73** (the `else` branch `find` command):

```bash
# Before (broken — recurses into archive/):
changes=$(find openspec/changes -mindepth 1 -type d \
  ! -name "specs" \
  ! -name "archive" \
  ! -name "refactor" \
  -exec test -f {}/proposal.md \; -print 2>/dev/null | \
  awk -F'openspec/changes/' '{print $2}' | sort -u)

# After (excludes archive subtree):
changes=$(find openspec/changes -mindepth 1 -type d \
  -not -path 'openspec/changes/archive/*' \
  ! -name "specs" \
  ! -name "archive" \
  ! -name "refactor" \
  -exec test -f {}/proposal.md \; -print 2>/dev/null | \
  awk -F'openspec/changes/' '{print $2}' | sort -u)
```

#### Step: "Detect branch type and find changes" — archive detection

**Replace lines 83-93** (archive_changes detection):

```bash
# Before (only finds dirs named "archive", misses dated subdirs):
archive_changes=""
for archive_dir in $(find openspec/changes -type d -name archive 2>/dev/null); do
  change_dir=$(dirname "$archive_dir")
  change_name=$(echo "$change_dir" | awk -F'openspec/changes/' '{print $2}')
  if [[ -n "$change_name" ]]; then
    archive_changes="$archive_changes $change_name"
  fi
done
archive_changes=$(echo "$archive_changes" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/^ //;s/ $//')

# After (detects both old and new structure):
archive_changes=""

# Old structure: type/change/archive/
for archive_dir in $(find openspec/changes -type d -name archive 2>/dev/null); do
  change_dir=$(dirname "$archive_dir")
  change_name=$(echo "$change_dir" | awk -F'openspec/changes/' '{print $2}')
  if [[ -n "$change_name" ]]; then
    archive_changes="$archive_changes $change_name"
  fi
done

# New structure: archive/YYYY-MM-DD-name/
for dated_dir in $(find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d -name '????-??-??-*' 2>/dev/null); do
  change_name=$(echo "$dated_dir" | awk -F'openspec/changes/archive/' '{print $2}')
  if [[ -n "$change_name" ]]; then
    archive_changes="$archive_changes archive/$change_name"
  fi
done

archive_changes=$(echo "$archive_changes" | tr ' ' '\n' | sort -u | tr '\n' ' ' | sed 's/^ //;s/ $//')
```

#### Step: "Close archived issues" — tighten issue matching

**Replace line 166** (main issue search):

```bash
# Before (too loose — matches any [SDD] issue containing the name substring):
main_issue=$(gh issue list --search "[SDD]" --state all --json number,title,state --jq '.[] | select(.title | contains("'"$change_name"'")) | .number' | head -1)

# After (tighter — requires [SDD] prefix + change name):
main_issue=$(gh issue list --search "[SDD] $change_name in:title" --state all --json number,title --jq '.[0].number')
```

**Replace line 181** (task issue search):

```bash
# Before:
task_list=$(gh issue list --search "[SDD-Task]" --state all --json number,title,state --jq '.[] | select(.title | contains("'"$change_name"'")) | .number')

# After:
task_list=$(gh issue list --search "[SDD-Task] $change_name in:title" --state all --json number,title --jq '.[].number')
```

### Migration script

```bash
#!/usr/bin/env bash
# migrate-archives.sh — One-time migration of legacy archives to canonical structure
# Run from repo root. Delete after successful migration.
set -euo pipefail

# Mapping: old_path -> date-name (date from git log, name from dir)
declare -A ARCHIVES=(
  ["feature/admin-crud"]="2026-05-14-admin-crud"
  ["feature/rate-limiting-account-lockout"]="2026-05-13-feature-rate-limiting-account-lockout"
  ["feature/feature-swagger-skill"]="2026-07-03-feature-swagger-skill"
  ["feature/add-opencode-openspec-integration"]="2026-07-03-add-opencode-openspec-integration"
  ["feature/email-service"]="2026-05-22-email-service"
  ["feature/docker-images-github"]="2026-07-03-docker-images-github"
  ["feature/admin-user-management-and-data-security"]="2026-05-22-admin-user-management-and-data-security"
  ["feature/issue-automation"]="2026-05-22-issue-automation"
  ["feature/roles-and-permissions"]="2026-05-22-roles-and-permissions"
  ["feature/stabilize-api-user"]="2026-05-22-stabilize-api-user"
  ["feature/api-documentation"]="2026-05-22-api-documentation"
  ["bugfix/sdd-sync-workflow-fix"]="2026-04-21-sdd-sync-workflow-fix"
  ["refactor/swagger-docs"]="2026-07-03-swagger-docs"
)

for old_path in "${!ARCHIVES[@]}"; do
  new_name="${ARCHIVES[$old_path]}"
  src="openspec/changes/$old_path"
  dst="openspec/changes/archive/$new_name"

  if [[ -d "$dst" ]]; then
    echo "SKIP (exists): $dst"
    continue
  fi

  echo "Migrating: $old_path -> archive/$new_name"
  git mv "$src" "$dst"
done

echo "Done. Review with: git status"
echo "Commit with: git commit -m 'refactor(openspec): migrate 13 legacy archives to canonical structure'"
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `find` commands produce expected paths | Run locally: `find openspec/changes ...` and verify output matches expected active/archived lists |
| Unit | Archive exclusion: no `proposal.md` from archived dirs in active list | Run `find` with `-not -path` filter, grep for `archive` in output — should be empty |
| Unit | New-structure detection finds all 7 dated dirs | `find openspec/changes/archive -mindepth 1 -maxdepth 1 -type d -name '????-??-??-*'` — count = 7 |
| Integration | Workflow YAML is valid | `act --list` or `yamllint .github/workflows/sdd-sync.yml` locally |
| Integration | Migration script moves all 13 dirs | Run script on a branch, verify `git status` shows correct moves |
| E2E (dry-run) | `workflow_dispatch` on test branch | Push to `bugfix/openspec-structure-sync-fix`, trigger workflow manually, verify no duplicate issues created |

## Migration / Rollout

### Phase order (critical — must be sequential)

1. **Workflow fix first** — merge the YAML fix so the workflow can detect new-structure archives
2. **Migration second** — run migration script, commit with `git mv` (single commit)
3. **Orphan cleanup third** — close issues #244, #246, #254, #255 manually via GitHub API or UI
4. **Script deletion fourth** — remove `scripts/migrate-archives.sh` in a follow-up commit

### Rollback

1. `git revert <migration-commit>` — restores old-structure dirs
2. `git revert <workflow-commit>` — restores previous detection (still works with old structure)
3. Re-open orphan issues if needed

## Open Questions

- [ ] Should we add a CI check that fails if `openspec/changes/archive/` contains non-dated subdirs? (Prevents future drift)
- [ ] The `feature/internacionalizacion` archive exists in new structure but has no corresponding old-structure dir — was it always created correctly? (Verify no orphan issue)
- [ ] Should the workflow skip `refactor/` type entirely from active detection? (Currently excluded by `! -name "refactor"` but refactor changes can still exist as direct children)
