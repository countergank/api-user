# Archive Report: env-makefile-standardization

**Change**: env-makefile-standardization
**Description**: Standardized environment configuration via per-env `.env.*` files, dynamic docker-compose env_file, Makefile as unified dev interface, Doppler auto-detection, migrate-mongo setup, MongoDB replica set sidecar init.
**Linear**: COU-118 (In Review)
**GitHub PR**: https://github.com/countergank/api-user/pull/338
**Git Branch**: `chore/env-makefile-standardization`
**Date**: 2026-07-13

## SDD Lifecycle

| Phase | Status | OpenSpec Artifact | Engram Topic |
|-------|--------|-------------------|-------------|
| Explore | ✅ Complete | exploration.md | `sdd/env-makefile-standardization/explore` |
| Proposal | ✅ Complete | proposal.md | `sdd/env-makefile-standardization/proposal` |
| Spec | ✅ Complete | specs/{makefile-devex,env-consistency}/spec.md | `sdd/env-makefile-standardization/spec` |
| Design | ✅ Complete | design.md | `sdd/env-makefile-standardization/design` |
| Tasks | ✅ Complete | tasks.md | `sdd/env-makefile-standardization/tasks` |
| Apply | ✅ Complete | (10 commits) | `sdd/env-makefile-standardization/apply-progress` |
| Verify | ✅ PASS WITH WARNINGS | verify-report.md | `sdd/env-makefile-standardization/verify-report` |
| Archive | ✅ Complete | archive-report.md | `sdd/env-makefile-standardization/archive-report` |

## Specs Synced to Main

| Domain | Action |
|--------|--------|
| makefile-devex | Created — 6 requirements (MF-01 to MF-06) |
| env-consistency | Created — 7 requirements (ENV-01 to ENV-07) |

## Key Deliverables

1. **Makefile**: 26+ targets with auto-generated help, Doppler auto-detection, ENV arg support
2. **Docker-compose**: mongo-init sidecar for replica set bootstrap, dynamic env_file, no auth in dev
3. **migrate-mongo**: `.migraterc.js` with directConnection=true, `make migrate/status/down/create` targets
4. **Env var drift fixed**: `.env.production.example`, `.env.local.testing`, `.env.example` all complete
5. **Scripts cleaned**: `docker-redeploy.sh`, `mongo-init.js`, `mongo-keyfile` deleted — replaced by Make targets

## Lessons Learned

1. MongoDB `--replSet` + `--auth` requires `--keyFile` — chicken-and-egg with init scripts
2. Replica set topology advertises `db-user:27017` — from host, need `directConnection=true`
3. Makefile default shell is `/bin/sh` (dash) — `source .env` needs `SHELL := /bin/bash`
4. Docker-compose `env_file:` only injects to container runtime — `--env-file` needed for compose-level interpolation
5. Legacy `openspec/changes/{feature,bugfix,refactor}` dirs from pre-canonical structure can be safely removed once archived