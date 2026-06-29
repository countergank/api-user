---
name: github-conventions
description: "Trigger: commits, PRs, branches, conventional commits, commit format, branch naming, PR template, changelog. Authoritative GitHub conventions for agents and humans."
license: MIT
metadata:
  author: countergank
  version: "1.0.0"
---

## When to Apply

Activate when writing commit messages, naming branches, creating pull requests, reviewing PR descriptions, setting up changelog automation, or establishing GitHub workflow conventions for a project. Applies to both agents and humans working with Git/GitHub.

## Rule Categories by Priority

| Priority | Category | Count | Key Rules |
|----------|----------|-------|-----------|
| P0 | Meta | 1 | Type definitions, SemVer mapping |
| P0 | Commit | 2 | Conventional Commits format, Subject line rules |
| P0 | Branch | 1 | Branch naming convention |
| P0 | PR | 2 | PR template sections, PR description structure |
| P1 | Commit | 2 | Body and footers, Scope naming |
| P1 | Branch | 1 | Branch lifecycle (create, rebase, cleanup) |
| P1 | PR | 2 | Issue linking, Review checklist |
| P1 | Meta | 1 | Changelog automation |
| P2 | Commit | 1 | Breaking changes notation |
| P2 | PR | 1 | Status labels |

## Quick Reference: Type Selection

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New user-visible feature or capability | `feat(auth): add OAuth2 login` |
| `fix` | Bug fix correcting broken behavior | `fix(api): handle null preferences` |
| `docs` | Documentation-only changes | `docs(readme): add quickstart` |
| `style` | Formatting, whitespace — no logic change | `style: fix indentation in utils` |
| `refactor` | Restructure without behavior change | `refactor(auth): extract token parser` |
| `perf` | Performance improvement | `perf(query): add index on user_id` |
| `test` | Test additions or corrections | `test(auth): cover token expiry` |
| `build` | Build system or dependencies | `build(deps): bump webpack to v5` |
| `ci` | CI/CD configuration | `ci: add coverage step to workflow` |
| `chore` | Maintenance, tooling, config | `chore: update editorconfig` |
| `revert` | Undo a previous commit | `revert: revert "feat: add dark mode"` |

## How to Use

1. **Agent loads this SKILL.md first** — the priority table tells the agent which rules matter most.
2. **Navigate `rules/<category>/` by priority** — start with `p0-*.md` files (always load), then `p1-*.md` (context-dependent), then `p2-*.md` (edge cases).
3. **Each rule file is self-contained** — read it, apply the pattern, move on. No need to load all 14 files.
4. **Use `assets/` for templates** — `PULL_REQUEST_TEMPLATE.md` and `COMMIT_TEMPLATE.txt` are ready-to-use starting points.
5. **Reference the Quick Reference table** for type selection before writing any commit message.
