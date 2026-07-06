# Workflow Sync Specification

## Purpose

Defines how the SDD sync workflow (`.github/workflows/sdd-sync.yml`) detects archived vs. active changes, ensuring no orphan issues are created and archived changes are correctly identified.

## Requirements

### Requirement: Archive Detection — New Structure (WF-01)

The workflow MUST detect changes archived in `openspec/changes/archive/<YYYY-MM-DD>-<name>/` as archived. Detection SHALL match directories under `openspec/changes/archive/` whose names begin with a date prefix (`????-??-??-*`).

#### Scenario: New-structure archive is detected

- GIVEN a directory `openspec/changes/archive/2026-05-22-audit-logging/` exists with a `proposal.md`
- WHEN the sync workflow runs
- THEN the workflow identifies `2026-05-22-audit-logging` as an archived change
- AND does NOT create a GitHub issue for it

#### Scenario: Multiple new-structure archives detected

- GIVEN 7 directories matching `archive/????-??-??-*` exist
- WHEN the sync workflow runs
- THEN all 7 are identified as archived

### Requirement: No Issues for Archived Changes (WF-02)

The workflow MUST NOT create new GitHub issues for any change that has been detected as archived (new or legacy structure).

#### Scenario: Archived change triggers no issue creation

- GIVEN `openspec/changes/archive/2026-05-14-admin-crud/` exists
- WHEN the sync workflow runs
- THEN no GitHub issue is created for `admin-crud`

### Requirement: Close Issues for Archived Changes (WF-03)

The workflow MUST close GitHub issues for changes that have been archived, matching issue titles to change names. This applies to both old-structure and new-structure archives.

#### Scenario: Archived change with open issue gets closed

- GIVEN `openspec/changes/archive/2026-05-22-audit-logging/` exists
- AND GitHub issue "audit-logging" is open
- WHEN the sync workflow runs
- THEN the issue is closed with the `archived` label

#### Scenario: Archived change with no open issue

- GIVEN an archived change exists with no corresponding open issue
- WHEN the sync workflow runs
- THEN no action is taken (no error, no duplicate)

### Requirement: Active Change Detection Excludes Archives (WF-04)

The workflow MUST identify active changes by scanning `openspec/changes/<type>/<change>/` while EXCLUDING the `archive/` subtree entirely. The `find` command SHALL prune any directory named `archive`.

#### Scenario: Push with only archived changes creates no issues

- GIVEN all changes under `openspec/changes/` are archived (legacy or new structure)
- WHEN the sync workflow runs
- THEN zero GitHub issues are created

#### Scenario: Active change alongside archives

- GIVEN `openspec/changes/feature/new-feature/` exists (no `archive/` subdir)
- AND `openspec/changes/archive/2026-05-22-audit-logging/` exists
- WHEN the sync workflow runs
- THEN an issue is created for `new-feature` only

### Requirement: Backward Compatibility Window (WF-05)

During the migration window, the workflow MUST handle both structures coexisting. Legacy archives (`<type>/<change>/archive/`) and new archives (`archive/<date>-<name>/`) MUST both be recognized as archived.

#### Scenario: Mixed structures during migration

- GIVEN `openspec/changes/feature/old-change/archive/` exists (legacy)
- AND `openspec/changes/archive/2026-05-22-audit-logging/` exists (new)
- WHEN the sync workflow runs
- THEN both are identified as archived
- AND neither triggers issue creation
