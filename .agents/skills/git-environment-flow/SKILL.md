---
name: git-environment-flow
description: "Trigger: environment, branch flow, staging, release branch, hotfix, promotion, deploy tracking, environment branches, develop, backmerge. Org-wide Git environment branch model, promotion flow, release lifecycle, and deployment tracking."
license: MIT
metadata:
  author: countergank
  version: "1.0.0"
---

## When to Apply

Activate when deciding which branch to target, cutting a release, applying a hotfix, curating staging, or tracking deployments across environments. Complements `github-conventions` — use both together for a complete Git workflow.

## Rule Categories by Priority

| Priority | Category | Count | Key Rules |
|----------|----------|-------|-----------|
| P0 | Environment | 1 | Permanent branches: develop, staging, main |
| P0 | Promotion | 1 | Left-to-right merge flow, backmerge |
| P1 | Hotfix | 1 | Main-first fix, backmerge to develop only |
| P1 | Release | 1 | release/x.y.z lifecycle, annotated tags, cleanup |
| P2 | Tracking | 1 | GitHub Environments mapping, tag-based rollback |

## Quick Reference

| Concept | Rule |
|---------|------|
| Environment branches | `develop` (default, integration), `staging` (pre-prod mirror), `main` (production, protected) |
| Merge direction | `feature → develop → release/x.y.z → staging → main → develop (backmerge)` |
| Tag format | `vX.Y.Z` (main, annotated), `vX.Y.Z-rcN` (staging, release candidates) |
| Hotfix flow | `hotfix/*` from main → merge to main (patch tag) → backmerge to develop only |

## Compatibility

This skill extends the Git workflow beyond what `github-conventions` covers:
- **Use `github-conventions` for**: branch naming (`feat/*`, `fix/*`, `hotfix/*`), commit format (Conventional Commits), PR template and review checklist.
- **This skill adds**: environment branch purposes, promotion/merge direction, release lifecycle, hotfix flow, and deployment tracking.

Load `github-conventions` first for naming conventions; load this skill when you need to know *which branch to target* or *how code flows between environments*.

## How to Use

1. **Agent loads this SKILL.md first** — the priority table tells the agent which rules matter most.
2. **Navigate `rules/<category>/` by priority** — start with `p0-*.md` files (always load), then `p1-*.md` (context-dependent), then `p2-*.md` (deploy scenarios).
3. **Each rule file is self-contained** — read it, apply the pattern, move on. No need to load all 5 files.
4. **Use `assets/` for future templates** — directory reserved for environment-specific CI/CD templates.
