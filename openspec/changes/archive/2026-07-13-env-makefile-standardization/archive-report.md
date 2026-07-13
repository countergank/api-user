# Archive Report: env-makefile-standardization

**Change**: chore/env-makefile-standardization
**Linear**: COU-118
**Branch**: chore/env-makefile-standardization
**Archived**: 2026-07-13
**Mode**: hybrid (Engram + OpenSpec filesystem)

## Phase Summary

### Explore
- Found 4 env files (.env.development, .env.local.testing, .env.production.example, .env.example)
- No .env.local (needed by docker-redeploy.sh default NODE_ENV=local)
- docker-compose.yml hardcoded env_file to .env.development
- No Makefile existed
- Env var drift: CORS_ORIGINS missing from .env.local.testing, JWT_SECRET+CORS_ORIGINS missing from .env.production.example, audit/logging vars missing from all files

### Proposal
- Scope: .env.local creation, docker-compose dynamic env_file, Makefile (~18 targets), env var drift fixes, docker-redeploy.sh validation

### Design
- 6 architecture decisions: dynamic env_file via ${NODE_ENV:-development}, colon target naming, auto-generated help, .env.local copy strategy, keep+enhance redeploy.sh, npm scripts as Windows fallback
- All 6 decisions resolved, no open questions

### Spec
- 2 new domains: makefile-devex (6 requirements: MF-01 through MF-06), env-consistency (7 requirements: ENV-01 through ENV-07)
- 13 total requirements with scenarios and edge cases

### Tasks
- 23 tasks across 4 phases: Makefile creation (11), Docker Compose dynamic env (3), Env file fixes (5), Script enhancement + verification (4)
- Low 400-line budget risk, single PR recommended

### Apply
- All 23 tasks completed
- Makefile created with 26 targets (exceeded 18 minimum)
- 4 work-unit commits: feat(make), fix(docker), chore(env), fix(scripts)
- 359 tests pass, zero TypeScript errors

### Verify
- PASS: 359 tests, 13 requirements covered, 23 tasks complete

## Specs Synced
| Domain | Action | Details |
|--------|--------|---------|
| makefile-devex | Created (NEW) | 6 requirements (MF-01 through MF-06) |
| env-consistency | Created (NEW) | 7 requirements (ENV-01 through ENV-07) |

## Archive Contents
- exploration.md ✅
- proposal.md ✅
- design.md ✅
- specs/makefile-devex/spec.md ✅
- specs/env-consistency/spec.md ✅
- tasks.md ✅ (23/23 tasks complete)

## Stale Checkbox Reconciliation
Filesystem tasks.md had all 23 tasks as unchecked (`- [ ]`) despite apply-progress proving completion. Reconciled to `- [x]` based on apply-progress evidence and user confirmation ("Verification: PASS"). Archive marked as intentional-with-reconciliation.

## Source of Truth Updated
- `openspec/specs/makefile-devex/spec.md` — NEW domain
- `openspec/specs/env-consistency/spec.md` — NEW domain

## Engram Artifact IDs
- Explore: #1092 | Proposal: #1093 | Design: #1094 | Spec: #1095 | Tasks: #1096 | Apply: #1097 | Archive: #1104

## Lessons Learned
1. Docker Compose v2 ${VAR:-default} in env_file works but --env-file flag only affects variable substitution
2. GNU Make requires `\:` escaping for colon-containing target names
3. WSL2 environment lacks Docker runtime — use python3 yaml.safe_load for YAML validation
4. Docker build produces dist/ owned by root — tsc --noEmit needs alternate tsBuildInfoFile path
5. .env.production.example was tracked before .env.* .gitignore rule was added
