# Tasks: refactor/issue-automation

## Phase 1: Workflow Foundation

- [x] 1.1 Add `hotfix/**` and `release/**` to branch triggers in `.github/workflows/sdd-sync.yml`
- [x] 1.2 Add `chore/**` to branch triggers in `.github/workflows/sdd-sync.yml`
- [x] 1.3 Add `workflow_dispatch` trigger for manual testing

## Phase 2: Branch Type Detection

- [x] 2.1 Add `detect-branch-type` step that extracts type from `GITHUB_REF`
- [x] 2.2 Implement case statement: feature→feature, bugfix→bugfix, hotfix→hotfix, release→release, chore→chore, default→enhancement
- [x] 2.3 Pass `BRANCH_TYPE` as env variable for use in issue creation

## Phase 3: Deduplication Logic

- [x] 3.1 Add `check-existing-issue` step before creating main issue
- [x] 3.2 Use `gh issue list --search "[SDD] $title in:title" --state open` to check
- [x] 3.3 If issue exists, skip creation and log existing issue number
- [x] 3.4 If issue doesn't exist, proceed to create

## Phase 4: Parent-Child Linking

- [x] 4.1 Capture parent issue number using `gh issue create --json number --jq '.number'`
- [x] 4.2 Store parent number in variable `PARENT_ISSUE_NUM`
- [x] 4.3 Update task creation to use `Parent: #${PARENT_ISSUE_NUM}` in body
- [x] 4.4 Ensure tasks only created after parent is successfully created

## Phase 5: Enriched Metadata

- [x] 5.1 Create enriched issue body template with branch name, type, phase, files
- [x] 5.2 Extract changed files list using `git diff --name-only`
- [x] 5.3 Read proposal summary for main issue body
- [x] 5.4 Update `.github/sdd-issue-template.md` with structured format

## Phase 6: Auto-Close Archive Job

- [x] 6.1 Add separate `close-archived` job to workflow
- [x] 6.2 Add trigger for path `openspec/changes/archive/**`
- [x] 6.3 Extract archived change name from modified path
- [x] 6.4 Search for open SDD issues matching archived change name
- [x] 6.5 Close parent issue with `gh issue close`
- [x] 6.6 Search and close related task issues
- [x] 6.7 Add `archived` label to closed issues

## Phase 7: Verification

- [x] 7.1 Test deduplication: push same change twice, verify single issue created ✅
  - Result: Workflow skipped creating duplicate when issue #25 already existed
- [x] 7.2 Test parent linking: verify task body contains `Parent: #N` ✅
  - Result: Task issue #26 correctly shows `Parent: #25` in body
- [x] 7.3 Test branch type: create from feature/, bugfix/, hotfix/ branches, verify labels ✅
  - Result: Bugfix branch correctly created issue with `bug` and `bugfix` labels
  - Labels `bug`, `bugfix`, `feature`, `hotfix`, `release`, `chore` auto-created
- [x] 7.4 Test auto-close: archive a change, verify issues closed with `archived` label ✅
  - Result: Archive job detected `openspec/changes/refactor/issue-automation/archive/` and closed issues #24, #25, #26
- [x] 7.5 Run `gh issue list --label sdd --state all` to verify final state ✅
  - Result: All SDD issues tracked correctly with proper state

### Verification Summary
| Feature | Test Branch | Issue # | Status |
|---------|-------------|---------|--------|
| Deduplication | feature/issue-automation | #25 | ✅ Skipped (already exists) |
| Parent linking | feature/issue-automation | #26 | ✅ Parent: #25 |
| Branch type detection | bugfix/test-issue-automation | #24 | ✅ Label: bugfix |
| Auto-close on archive | archived change | #24,25,26 | ✅ Closed with `archived` label |

---
Trigger: Wed Apr 15 17:14:47 UTC 2026

---
Trigger: Wed Apr 15 17:23:20 UTC 2026

---
Verification completed: Wed Apr 15 18:00 UTC 2026
---
Trigger for workflow test: Wed Apr 15 22:00 UTC 2026
