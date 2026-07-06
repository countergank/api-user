# Orphan Cleanup Specification

## Purpose

Defines the one-time closure of GitHub issues created by the workflow bug, and the prevention of future orphans.

## Requirements

### Requirement: Close Orphan Issues (ORP-01)

GitHub issues #244, #246, #254, #255 MUST be closed with the `archived` label and a comment explaining they were created by the SDD sync workflow bug (COU-119).

#### Scenario: Each orphan issue is closed with label and comment

- GIVEN GitHub issue #244 is open with title matching an archived change
- WHEN orphan cleanup executes
- THEN issue #244 is closed
- AND label `archived` is applied
- AND a comment is posted: "Closed by COU-119 fix — this issue was created by the SDD sync workflow bug detecting archived changes as active."

#### Scenario: All 4 orphans closed

- GIVEN issues #244, #246, #254, #255 are open
- WHEN orphan cleanup executes
- THEN all 4 issues are closed with `archived` label

#### Scenario: Orphan already closed

- GIVEN an orphan issue is already closed
- WHEN orphan cleanup executes
- THEN the label and comment are still applied (idempotent)

### Requirement: Prevent Future Orphans (ORP-02)

After the workflow fix (WF-04) is deployed, no new orphan issues SHALL be created. The workflow's active-change detection MUST exclude all archived changes.

#### Scenario: Post-fix workflow run creates no orphans

- GIVEN the workflow fix is merged to main
- AND all changes are either active or properly archived
- WHEN the sync workflow runs on push
- THEN only genuinely active changes get new issues
- AND no issues are created for archived changes
