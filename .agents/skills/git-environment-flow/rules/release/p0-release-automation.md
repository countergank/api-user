---
priority: P0
category: release
---

# Automate version bump, changelog, and annotated tag from commit history

**Do**: Automate version determination from commit history, generate changelog following Keep a Changelog sections, create annotated tags with version and date.
**Avoid**: Auto-push to remote, release on empty changes, override SemVer priority without explicit flag, create lightweight tags.
**Reference**: `github-conventions/rules/meta/p0-type-definitions.md` for SemVer mapping, `github-conventions/rules/meta/p1-changelog-automation.md` for changelog format, `git-environment-flow/rules/release/p1-release-lifecycle.md` for branch flow.

## Prerequisites

Before executing this procedure, load and understand these rule files:

1. `github-conventions/rules/meta/p0-type-definitions.md` — canonical commit types and SemVer impact mapping
2. `github-conventions/rules/meta/p1-changelog-automation.md` — Keep a Changelog section mapping and format
3. `git-environment-flow/rules/release/p1-release-lifecycle.md` — release branch lifecycle, tag format, and merge flow

## Procedure

### Step 1: Find last version tag

```bash
git describe --tags --abbrev=0 --match "v*"
```

If no `v*` tag exists, assume the repository starts at version `1.0.0` and include the full commit history.

### Step 2: Collect commits since last tag

```bash
git log --oneline ${LAST_TAG}..HEAD
```

If no previous tag, use the full log: `git log --oneline`. Filter to conventional commit messages (matching `type(scope): description` or `type: description`).

### Step 3: Determine bump from commits

Apply SemVer priority rules from `p0-type-definitions.md`:

| Commit Pattern | Bump |
|----------------|------|
| `feat!:` or `BREAKING CHANGE:` footer | MAJOR |
| `feat:` | MINOR |
| `fix:` or `perf:` | PATCH |

**Priority**: BREAKING > feat > fix > perf

If `--bump` flag is provided, override auto-detection with the specified bump.

If no bump is applicable (only `docs`, `style`, `test`, `chore`, `build`, `ci`, `refactor` commits), **abort** with exit code 2 and message: `No releasable changes found since last tag`.

### Step 4: Compute next version

Parse `<major>.<minor>.<patch>` from the last tag string (strip the `v` prefix). Apply the bump:

- **MAJOR**: increment major, reset minor and patch to 0 (e.g., `1.2.3` → `2.0.0`)
- **MINOR**: increment minor, reset patch to 0 (e.g., `1.2.3` → `1.3.0`)
- **PATCH**: increment patch (e.g., `1.2.3` → `1.2.4`)

If no previous tag exists, use `1.0.0` as the base and apply the determined bump.

### Step 5: Generate changelog

Map commits to [Keep a Changelog](https://keepachangelog.com/) sections using `p1-changelog-automation.md`:

| Section | Commits |
|---------|---------|
| Breaking Changes | Commits with `feat!:` or `BREAKING CHANGE:` footer |
| Added | `feat:` commits |
| Changed | `refactor:` and `perf:` commits |
| Fixed | `fix:` commits |
| Removed | `revert:` commits |

**Omit entirely**: `docs`, `style`, `test`, `chore`, `build`, `ci` commits. These are internal and do not appear in the changelog.

Format each entry as: `- <description> (<scope>)` where scope is extracted from the commit if present.

### Step 6: Create annotated tag

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z - YYYY-MM-DD

<changelog>"
```

The tag message MUST include:
- Line 1: `Release X.Y.Z - YYYY-MM-DD`
- Blank line
- Full changelog content

**Annotated tags only** — never use lightweight tags (`git tag vX.Y.Z` without `-a`).

### Step 7: Output

Print to stdout:
- Version: `X.Y.Z`
- Changelog: full Keep a Changelog section
- Tag SHA: output of `git rev-parse vX.Y.Z`

If `--changelog=FILE` is specified, prepend the new release section to the file before the existing content (below the header).

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--bump` | `major`, `minor`, `patch`, `auto` | `auto` | Override automatic bump detection |
| `--dry-run` | boolean flag | — | Show what would happen without creating the tag |
| `--changelog` | `stdout`, `FILE` path | `stdout` | Where to output the changelog |

## Rules

- **Batch-only**: always processes ALL commits since last tag, never individual commits
- **Annotated tags only**: `git tag -a` — lightweight tags are forbidden
- **Never push to remote**: tag creation is local; push is a separate manual step
- **Abort with clear message**: if no releasable changes are found, exit with code 2 and descriptive message
- **Date format**: use `YYYY-MM-DD` (ISO 8601) in tag messages and changelog entries

## Concrete Examples

```
✅ Good: release.sh --dry-run — shows version 1.3.0 with 2 feat, 1 fix
✅ Good: release.sh --bump minor — forces MINOR regardless of commits
✅ Good: git tag -a v1.3.0 -m "Release 1.3.0 - 2026-08-25\n\n### Added\n- ..."
✅ Good: release.sh exits 2 with "No releasable changes found since last tag"
❌ Bad:  release.sh pushes to remote automatically
❌ Bad:  Lightweight tag: git tag v1.3.0 (no -a flag)
❌ Bad:  release.sh continues when only chore/docs commits exist
❌ Bad:  Tag message missing date: git tag -a v1.3.0 -m "Release 1.3.0"
```
