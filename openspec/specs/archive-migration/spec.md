# Archive Migration Specification

## Purpose

Defines the one-time migration of legacy archive directories (`openspec/changes/<type>/<change>/archive/`) to the canonical structure (`openspec/changes/archive/<YYYY-MM-DD>-<change>/`).

## Requirements

### Requirement: Migrate Legacy Archives to New Structure (MIG-01)

All 13 legacy archives in `openspec/changes/<type>/<change>/archive/` MUST be moved to `openspec/changes/archive/<YYYY-MM-DD>-<change>/`. The migration is a directory move — no file content changes.

#### Scenario: Legacy archive is relocated

- GIVEN `openspec/changes/feature/admin-crud/archive/` contains `completed.md`
- WHEN migration executes
- THEN `openspec/changes/archive/<date>-admin-crud/` exists with all original files
- AND `openspec/changes/feature/admin-crud/archive/` no longer exists

#### Scenario: All 13 legacy archives migrated

- GIVEN 13 legacy archive directories exist
- WHEN migration completes
- THEN 13 new directories exist under `openspec/changes/archive/`
- AND zero legacy `archive/` directories remain under `<type>/<change>/`

### Requirement: Date Prefix Derivation (MIG-02)

The date prefix for migrated archives SHOULD be derived from the `completed.md` metadata date. If no date is available, the git commit date of the archive's last commit SHALL be used. If neither is available, the current date MAY be used as a last resort.

#### Scenario: Date from completed.md

- GIVEN `openspec/changes/feature/admin-crud/archive/completed.md` contains date `2026-05-14`
- WHEN migration executes
- THEN the new directory is named `2026-05-14-admin-crud`

#### Scenario: No completed.md — fallback to git date

- GIVEN a legacy archive with no `completed.md`
- AND the last git commit touching that archive is `2026-04-15`
- WHEN migration executes
- THEN the new directory uses prefix `2026-04-15`

#### Scenario: Name already contains date — no double-prefix

- GIVEN a legacy change named `feature-2026-03-release` with archive
- WHEN migration executes
- THEN the directory is named `<date>-feature-2026-03-release` (date prepended, not duplicated)

### Requirement: Preserve All Files (MIG-03)

Migration MUST preserve every file within each archived change. This is a pure directory move — no content modifications, no file deletions, no renames within the archive.

#### Scenario: File count preserved

- GIVEN `openspec/changes/feature/email-service/archive/` contains 3 files
- WHEN migration executes
- THEN `openspec/changes/archive/<date>-email-service/` contains exactly 3 files with identical content

### Requirement: Legacy Directory Removal (MIG-04)

After migration, the legacy `<type>/<change>/archive/` directory MUST be removed to prevent double-detection by the workflow.

#### Scenario: Legacy directory is cleaned up

- GIVEN `openspec/changes/feature/admin-crud/archive/` was migrated
- WHEN migration completes
- THEN `openspec/changes/feature/admin-crud/archive/` does not exist
- AND the parent `openspec/changes/feature/admin-crud/` MAY remain if it contains non-archive files
