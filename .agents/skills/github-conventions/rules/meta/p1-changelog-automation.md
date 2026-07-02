---
priority: P1
category: meta
---

# Automate CHANGELOG generation from commit types

**Do**: Generate the CHANGELOG automatically from commit messages using Conventional Commits types, following the Keep a Changelog format with sections for Added, Changed, Deprecated, Removed, Fixed, and Security.
**Avoid**: Manually writing CHANGELOG entries, forgetting to update it before releases, or mixing commit types into the wrong CHANGELOG section.
**Reference**: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## SemVer to CHANGELOG Mapping

| Commit Type | CHANGELOG Section | SemVer Impact |
|-------------|-------------------|---------------|
| `feat` | **Added** | `MINOR` |
| `fix` | **Fixed** | `PATCH` |
| `perf` | **Changed** | `PATCH` |
| `refactor` | **Changed** | None |
| `style` | (omit — internal) | None |
| `docs` | (omit — internal) | None |
| `test` | (omit — internal) | None |
| `chore` | (omit — internal) | None |
| `build` | (omit — internal) | None |
| `ci` | (omit — internal) | None |
| `revert` | **Removed** | Inverse |
| `BREAKING CHANGE` | **Breaking Changes** (top of release) | `MAJOR` |

## Keep a Changelog Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-06-15

### Added
- OAuth2 login with Google provider (#42)

### Fixed
- Return 404 for missing resources instead of 500 (#91)

### Breaking Changes
- `/api/preferences` returns `{}` instead of `null` for unset preferences
```

## Automation Tools

- **standard-version** / **commit-and-tag-version**: Bumps version, generates CHANGELOG, creates git tag.
- **conventional-changelog**: Parses commits and produces CHANGELOG markdown.
- **release-please**: GitHub Action that automates releases from Conventional Commits.

**Examples**:
```
✅ Good: CI pipeline runs `conventional-changelog` on merge to main,
         appending new entries under an "Unreleased" section.
❌ Bad:  Developer manually edits CHANGELOG.md and forgets to include
         the fix from last week's merge.
```
