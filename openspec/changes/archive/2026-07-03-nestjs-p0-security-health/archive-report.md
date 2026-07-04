# Archive Report: nestjs-p0-security-health (COU-113)

**Change**: nestjs-p0-security-health
**Description**: Fixed two P0 security blockers (CORS open to all origins, JWT secret with hardcoded fallback) and added `/health` endpoint for Docker HEALTHCHECK compatibility.
**Linear**: COU-113 (Done)
**GitHub PR**: https://github.com/countergank/api-user/pull/251 (merged)
**Git Branch**: `fix/p0-security-health`
**Date**: 2026-07-03

## SDD Lifecycle

| Phase | Status | Engram ID | Topic Key |
|-------|--------|-----------|-----------|
| Explore | ✅ Complete | #1045 | `sdd/nestjs-p0-security-health/explore` |
| Proposal | ✅ Complete | #1046 | `sdd/nestjs-p0-security-health/proposal` |
| Design | ✅ Complete | #1047 | `sdd/nestjs-p0-security-health/design` |
| Spec | ✅ Complete | #1048 | `sdd/nestjs-p0-security-health/spec` |
| Tasks | ✅ Complete | #1049 | `sdd/nestjs-p0-security-health/tasks` |
| Apply | ✅ Complete | #1050 | `sdd/nestjs-p0-security-health/apply-progress` |
| Verify | ✅ PASS | #1051 | `sdd/nestjs-p0-security-health/verify-report` |
| Archive | ✅ Complete | #1052 | `sdd/nestjs-p0-security-health/archive-report` |

## Key Metrics

| Metric | Value |
|--------|-------|
| Tests | 316 tests, 36 suites — ALL PASS |
| Type errors | 0 |
| Spec requirements | 7/7 COMPLIANT |
| Tasks | 15/15 COMPLETE |
| Files changed | 16 files |
| Lines changed | +402 / -88 |
| Commits | 8 work-unit commits |
| Critical issues | 0 |
| Warnings | 1 (pre-existing biome lint, not in changed files) |

## Workstreams Delivered

### WS-1: Security Fixes
- **SEC-01**: CORS origin allowlist — `CORS_ORIGINS` env var required, app rejects non-allowlisted origins
- **SEC-02**: JWT secret validation — `JWT_SECRET` required with `@IsNotEmpty()`, no hardcoded fallback
- **SEC-03**: JWT secret via ConfigService — `JwtModule.registerAsync` + `ConfigService` injection, zero direct `process.env` access
- **SEC-04**: Env var documentation — `.env.example` documents both vars as REQUIRED

### WS-2: Health Check
- **HLTH-01**: `GET /health` endpoint returns 200 with health status
- **HLTH-02**: MongoDB connectivity check via `@nestjs/terminus` Mongoose ping
- **HLTH-03**: Docker HEALTHCHECK compatible — exits 0 on 200, exits 1 otherwise

### Additional Fix
- Mongoose connection URI now includes `DATABASE_USER`/`DATABASE_PASSWORD` credentials

## Artifact Store Mode

**Mode**: hybrid (openspec + engram)

## Lessons Learned

1. **JWT secret was duplicated in TWO places** — both needed fixing with `ConfigService` injection
2. **CORS was completely open** despite `FRONTEND_URL` existing in env validation (but `@IsOptional()` and never wired)
3. **`@nestjs/terminus` was not installed** — new dependency required for health checks
4. **Mongoose URI missing auth credentials** — `DATABASE_USER`/`DATABASE_PASSWORD` were validated but not used in the connection string
5. **AppController had a comment claiming health endpoint existed** — it didn't, only version info at `GET /`

## Deviations

- No deviations from spec or design. All 7 requirements fully compliant.
- Biome lint warnings (18 diagnostics) are pre-existing in unchanged files, not related to this change.