# Release — Priority P0–P1

Read this file when bumping the version, cutting a release branch, or tagging a release.

## P0 — Run `assets/release.sh`; do not hand-roll the bump

`assets/release.sh` is the implementation of this rule. It reads the last `v*` tag, collects every commit since, maps the Conventional Commit types to a SemVer bump (`feat!` or a `BREAKING CHANGE` footer → MAJOR, `feat` → MINOR, `fix` and `perf` → PATCH, everything else → no release), computes the next version, writes the Keep a Changelog section and creates an annotated tag. Run it instead of walking the procedure by hand or editing a version string.

| Flag | Values | Default | Effect |
|------|--------|---------|--------|
| `--bump` | `major`, `minor`, `patch`, `auto` | `auto` | Override the detected bump |
| `--dry-run` | flag | off | Show version and changelog, create no tag |
| `--changelog` | `stdout` or a file path | `stdout` | Prepend the section to a file instead of printing it |
| `--from` | a git ref | last tag | Start the commit range somewhere else |

The contract is narrow on purpose: it aborts with exit code 2 and `No releasable changes found since last tag` when only `docs`, `style`, `test`, `chore`, `build`, `ci` or `refactor` commits exist, and it never pushes — the tag is local and pushing it is a separate, deliberate step. The SemVer-to-commit mapping itself belongs to `github-conventions/rules/commit.md`, which this skill references and never redefines.

```text
// ✅ Let the history decide the version, then push as its own step
./assets/release.sh --dry-run
./assets/release.sh && git push origin main --follow-tags
// ❌ Hand-rolled version and lightweight tag, pushed without reading the changelog
git tag v1.3.0 && git push --tags
```

## P1 — Cut `release/x.y.z` from develop and tag both environments

A release branch is cut from `develop` when scope is frozen, and only bugfixes land on it afterwards. That same branch merges to `staging` for curation and then to `main`; `staging` is never the source of `main`. Each environment gets its own annotated tag, the branch is deleted after the cycle, and the tags stay as the record.

| Tag | Created on | Example |
|-----|------------|---------|
| `vX.Y.Z-rcN` | `staging`, per curation round | `git tag -a v1.2.0-rc1 -m "RC1 1.2.0 - 2026-06-24"` |
| `vX.Y.Z` | `main`, at production | `git tag -a v1.2.0 -m "Release 1.2.0 - 2026-06-24"` |

Release branch names and tags follow `x.y.z` strictly, and the tag message carries the version and an ISO `YYYY-MM-DD` date. A release branch that outlives its cycle turns into a second integration branch nobody promotes; deleting it after the backmerge is what keeps the model to three permanent branches.

```text
// ✅ Cut, stabilize with bugfixes only, tag rc then final, backmerge, delete
develop ──▶ release/1.2.0 ──▶ staging (v1.2.0-rc1) ──▶ main (v1.2.0) ──▶ develop, branch deleted
// ❌ Features after the cut, a light tag, or a release branch left alive
release/1.2.0 with new feat commits after cut, git tag v1.2.0, branch still open
```
