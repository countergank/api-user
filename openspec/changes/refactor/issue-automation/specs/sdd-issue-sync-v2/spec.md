# Delta for sdd-issue-sync-v2

## Purpose

This spec defines the SDD GitHub Issues synchronization v2 capability. It replaces the basic issue creation logic with deduplication, parent-child linking, branch type detection, enriched metadata, and auto-close on archive.

## ADDED Requirements

### Requirement: Deduplication

The system SHALL check for existing issues with the same title before creating new ones. If an issue with the matching title already exists, the system MUST skip creation for that issue.

#### Scenario: No existing issue

- GIVEN a new change "feature/add-login" is pushed
- WHEN the workflow runs
- THEN the system creates a new issue "[SDD] feature/add-login"
- AND creates task issues as defined in tasks.md

#### Scenario: Issue already exists

- GIVEN a change "feature/add-login" was previously pushed
- AND an issue "[SDD] feature/add-login" already exists
- WHEN the workflow runs again for the same change
- THEN the system MUST NOT create a duplicate issue
- AND the system MUST skip creating duplicate task issues

#### Scenario: Different branch same name

- GIVEN a change "feature/add-login" exists on develop branch
- AND the same change name is pushed to a feature branch
- WHEN the workflow runs for the feature branch
- THEN the system creates separate issues for each branch
- AND each issue includes its branch name in metadata

---

### Requirement: Parent-Child Linking

The system SHALL create task issues that reference the main SDD issue as their parent. The parent reference MUST be stored in the issue body and MUST include the issue number.

#### Scenario: Create task with parent reference

- GIVEN a main SDD issue was created with number #45
- WHEN the workflow creates task issues
- THEN each task issue body MUST include "Parent: #45"
- AND the task title MUST follow pattern "[SDD-Task] {change}: {task description}"

#### Scenario: Task linked to correct parent

- GIVEN changes "feature/add-login" and "feature/add-logout"
- WHEN both create task issues
- THEN feature/add-login tasks reference feature/add-login parent
- AND feature/add-logout tasks reference feature/add-logout parent
- AND no cross-linking occurs

---

### Requirement: Branch Type Detection

The system SHALL detect the branch type from the branch name using prefix matching. The detected type MUST be applied as a label to the created issues.

| Branch Prefix | Label | Default Priority |
|---------------|-------|------------------|
| `feature/` | `feature` | Enhancement |
| `bugfix/` | `bugfix` | Bug |
| `hotfix/` | `hotfix` | Urgent |
| `release/` | `release` | Release |
| `chore/` | `chore` | Maintenance |
| Other | `enhancement` | Enhancement |

#### Scenario: Feature branch detection

- GIVEN a branch named "feature/user-login"
- WHEN the workflow detects branch type
- THEN the system SHALL apply label "feature"
- AND main issue gets labels: sdd, feature, needs-review

#### Scenario: Bugfix branch detection

- GIVEN a branch named "bugfix/PRJ-123-header-fix"
- WHEN the workflow detects branch type
- THEN the system SHALL apply label "bugfix"
- AND main issue gets labels: sdd, bugfix, needs-review

#### Scenario: Hotfix branch detection

- GIVEN a branch named "hotfix/security-patch"
- WHEN the workflow detects branch type
- THEN the system SHALL apply label "hotfix"
- AND main issue gets labels: sdd, hotfix, urgent

#### Scenario: Release branch detection

- GIVEN a branch named "release/v2.1.0"
- WHEN the workflow detects branch type
- THEN the system SHALL apply label "release"
- AND main issue gets labels: sdd, release, needs-review

#### Scenario: Chore branch detection

- GIVEN a branch named "chore/update-docs"
- WHEN the workflow detects branch type
- THEN the system SHALL apply label "chore"
- AND main issue gets labels: sdd, chore, maintenance

#### Scenario: Unknown branch type

- GIVEN a branch named "develop" or "main"
- WHEN the workflow detects branch type
- THEN the system SHALL default to "enhancement" type
- AND main issue gets labels: sdd, enhancement

---

### Requirement: Enriched Metadata

The issue body SHALL include structured metadata about the change. Metadata MUST include branch name, detected type, SDD phase, and list of changed files.

#### Scenario: Main issue with full metadata

- GIVEN a change "feature/add-login" on branch "feature/add-login"
- WHEN the main issue is created
- THEN the body MUST include:
  - Branch: feature/add-login
  - Type: feature
  - SDD Phase: implementation
  - Summary: (from proposal.md first line)
  - Files Changed: (list of files in openspec/changes/{change}/)

#### Scenario: Task issue with parent metadata

- GIVEN a task issue for "feature/add-login"
- WHEN the task issue is created
- THEN the body MUST include:
  - Parent: #{issue_number}
  - Change: feature/add-login
  - Branch: feature/add-login
  - Task: {task description from tasks.md}

---

### Requirement: Auto-Close on Archive

The system SHALL close all related issues (main and tasks) when a change is archived. Archive is detected by the presence of files in `openspec/changes/{change}/archive/`.

#### Scenario: Archive triggers close

- GIVEN a change "feature/add-login" has an open main issue #45
- AND it has task issues #46, #47, #48 linked to #45
- WHEN a file is created in `openspec/changes/feature/add-login/archive/`
- THEN the workflow SHALL close issue #45
- AND close issues #46, #47, #48
- AND add label "archived" to all closed issues

#### Scenario: No action on non-archive changes

- GIVEN a file is modified in `openspec/changes/feature/add-login/specs/`
- WHEN the workflow runs
- THEN the system SHALL NOT close any issues
- AND SHALL NOT add "archived" label

---

## Error Handling

### Requirement: GitHub API Failures

The system SHALL handle GitHub API failures gracefully. If issue creation fails, the workflow MUST log the error and continue processing remaining changes.

#### Scenario: API rate limit

- GIVEN GitHub API rate limit is exceeded
- WHEN an issue creation fails
- THEN the workflow SHOULD retry up to 3 times with exponential backoff
- AND if all retries fail, log error with change name
- AND continue processing remaining changes

#### Scenario: Missing proposal or tasks file

- GIVEN a change directory exists without proposal.md
- WHEN the workflow processes that change
- THEN use directory name as title (current behavior)
- AND log a warning about missing proposal.md

---
Trigger: Wed Apr 15 15:50:35 UTC 2026
