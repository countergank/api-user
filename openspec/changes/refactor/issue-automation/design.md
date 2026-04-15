# Design: refactor/issue-automation

## Technical Approach

Enhance the existing `.github/workflows/sdd-sync.yml` shell-based workflow to support deduplication, parent-child linking, branch type detection, enriched metadata, and auto-close on archive.

## Architecture Decisions

### Decision: Shell-based vs JS Action

**Choice**: Shell-based (keep existing approach)
**Alternatives considered**: JavaScript action with @actions/core SDK
**Rationale**: 
- Single file, no npm dependencies to maintain
- Simpler debugging (direct shell output)
- Faster CI initialization
- Team already has working knowledge of current implementation

### Decision: Deduplication Strategy

**Choice**: Title-based matching using `gh issue list --search`
**Alternatives considered**: GitHub API with GraphQL, issue state file in repo
**Rationale**: 
- No external state management needed
- Works across parallel workflow runs
- Title pattern `[SDD] <change-name>` is unique enough
- Low complexity for expected issue volume

**Implementation**:
```bash
existing=$(gh issue list --search "[SDD] $title in:title" --state open --json number --jq '.[0].number')
if [[ -n "$existing" ]]; then
  echo "Issue already exists: #$existing"
  continue
fi
```

### Decision: Parent-Child Linking

**Choice**: Capture parent issue number, store in task body as `Parent: #N`
**Alternatives considered**: GitHub Projects, labels with IDs
**Rationale**: Simple text reference in body is visible in GitHub UI without additional setup. Tasks created synchronously in same run after parent is created.

**Implementation**:
```bash
parent_num=$(gh issue create ... --json number --jq '.number')
# Then create tasks with reference
gh issue create --title "[SDD-Task] $task" --body "Parent: #$parent_num" ...
```

### Decision: Branch Type Detection

**Choice**: Extract from `GITHUB_REF` or `github.head_ref` (for PRs)
**Alternatives considered**: Git log analysis, config file
**Rationale**: Branch name is available in workflow context, no additional git operations needed.

**Implementation**:
```bash
branch="${GITHUB_HEAD_REF:-${GITHUB_REF#refs/heads/}}"
case "$branch" in
  feature/*) label="feature" ;;
  bugfix/*)  label="bugfix" ;;
  hotfix/*)  label="hotfix" ;;
  release/*) label="release" ;;
  chore/*)   label="chore" ;;
  *)         label="enhancement" ;;
esac
```

### Decision: Auto-Close on Archive

**Choice**: Separate `close-archived` job triggered on `openspec/changes/archive/**` path
**Alternatives considered**: Single job with conditional logic, webhook trigger
**Rationale**: Archive is a distinct event (move to archive directory), separate job keeps logic clean and allows independent triggering.

### Decision: Archived Label

**Choice**: Add `archived` label to closed issues
**Rationale**: Allows filtering `is:issue label:archived` to see completed changes. Distinguishes from random closes.

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        TRIGGER                               │
│  push to openspec/changes/* OR openspec/changes/archive/*  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 IS ARCHIVE PATH?                            │
│  If yes → Close Issues Job                                  │
│  If no → Create Issues Job                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  CLOSE JOB       │   │  CREATE JOB       │
│  - List open SDD │   │  - Dedup check    │
│  - Extract refs  │   │  - Branch type     │
│  - Close parent  │   │  - Create parent   │
│  - Close tasks   │   │  - Create tasks    │
│  - Add archived  │   │                   │
└──────────────────┘   └──────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/sdd-sync.yml` | Modify | Enhanced workflow with deduplication, linking, branch detection, archive close |
| `.github/sdd-issue-template.md` | Modify | Enriched template with branch name, type, phase, files changed |

## Workflow Logic (Pseudocode)

```yaml
# Main sync workflow
on:
  push:
    branches: [main, develop, 'feature/**', 'bugfix/**', 'hotfix/**', 'release/**', 'chore/**']
    paths: ['openspec/changes/**', '!openspec/changes/archive/**']
  pull_request:
    paths: ['openspec/changes/**', '!openspec/changes/archive/**']
  workflow_dispatch:

jobs:
  sync:
    steps:
      1. Checkout with full history
      2. Detect branch type from GITHUB_REF
      3. Extract changed directories
      4. For each change:
         a. Extract title from proposal.md
         b. Check if issue already exists (dedup)
         c. If not exists:
            - Create parent issue with enriched body
            - Get parent issue number
            - Create task issues with parent reference (same run)
         d. If exists:
            - Log existing issue number, skip

  close-archived:
    if: contains(github.event.head_commit.modified, 'openspec/changes/archive/')
    steps:
      1. Get archived change name from path
      2. Search for open issues with "[SDD] <archived-change>"
      3. Close parent issue
      4. Search and close related task issues
      5. Add "archived" label
```

## Issue Body Structure

```markdown
## Summary
**Change**: {change-name}
**Branch**: {branch-name}
**Type**: {feature|bugfix|hotfix|release|chore}
**Phase**: {propose|spec|design|task|apply|verify|archive}

### Overview
{From proposal.md overview section}

### Files Changed
```
{List of changed files in this change}
```

---
*Generated by SDD Issue Sync v2*
```

## Testing Strategy

| Test | Approach |
|------|----------|
| Manual trigger | `workflow_dispatch` with inputs for testing |
| Deduplication | Push same change twice, verify single issue |
| Parent-child | Check task body contains `Parent: #N` |
| Branch labels | Create from each branch type, verify labels |
| Auto-close | Archive a change, verify issues closed with `archived` label |

**Verification Commands**:
```bash
# Manual workflow run
gh workflow run sdd-sync.yml --ref feature/test

# List SDD issues
gh issue list --search "[SDD]" --label sdd --state all

# Check parent reference
gh issue view 123 --json body --jq '.body' | grep "Parent:"
```
