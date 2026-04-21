# Proposal: refactor/issue-automation

## Intent

Improve the SDD GitHub Issues sync workflow to eliminate issue proliferation (no deduplication), add proper parent-child linking between main issues and tasks, auto-detect branch types for labeling, include enriched metadata, and auto-close issues when changes are archived.

## Scope

### In Scope
- Deduplication: Skip creating issues that already exist
- Parent-child linking: Tasks reference parent issue number in body
- Branch type auto-detection: `feature/`, `bugfix/`, `hotfix/`, `release/`, `chore/`
- Enriched metadata: Include branch name, type, phase, and changed files in issue body
- Auto-close on archive: Close main and task issues when change is archived
- Enhanced issue template: Use structured format with all metadata

### Out of Scope
- MCP GitHub integration (spec exists but implementation deferred)
- Complete workflow rewrite (keep shell-based for simplicity)
- E2E testing of workflow (manual verification only)

## Capabilities

### New Capabilities
- `sdd-issue-sync-v2`: GitHub Issues synchronization with deduplication, parent linking, branch type detection, and auto-close

## Approach

Enhance existing `.github/workflows/sdd-sync.yml` shell-based workflow:
1. Add `gh issue list` check before creation for deduplication
2. Extract branch type from GITHUB_REF or branch name
3. Capture main issue number and pass to task creation
4. Include parent reference in task issue body
5. Add archive trigger path to close issues when change is archived
6. Update template to include structured metadata

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/sdd-sync.yml` | Modified | Enhanced workflow logic |
| `.github/sdd-issue-template.md` | Modified | Enriched template with metadata |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Race condition in parallel runs | Medium | Use `gh issue list` with delay retry |
| Issue proliferation if logic fails | Low | Dry-run option for testing |
| Template format breaking | Low | Keep backwards compatible body |

## Rollback Plan

Revert `.github/workflows/sdd-sync.yml` to previous version from git history. Template changes can be reverted independently.

## Dependencies

- `gh` CLI installed in GitHub Actions (ubuntu-latest has it)
- Repository write permissions for issues

## Success Criteria

- [ ] Creating same change twice does NOT create duplicate issues
- [ ] Task issues include parent issue number in body
- [ ] Issues labeled correctly based on branch type
- [ ] Issue body includes branch name, type, and SDD phase
- [ ] Archiving a change closes all related issues
- [ ] Manual workflow run succeeds without errors

---
Updated: 2026-04-15T15:27:00+00:00

---
Trigger test: Wed Apr 15 17:18:40 UTC 2026
