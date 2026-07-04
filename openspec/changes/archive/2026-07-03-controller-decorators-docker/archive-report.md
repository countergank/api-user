# Archive Report: controller-decorators-docker

## Change Summary

**Change**: `controller-decorators-docker`
**Linear**: [COU-114](https://linear.app/countergank/issue/COU-114) (In Review)
**GitHub Issue**: [#252](https://github.com/countergank/api-user/issues/252)
**GitHub PR**: [#253](https://github.com/countergank/api-user/pull/253)
**Branch**: `refactor/controller-decorators-docker`
**Archived**: 2026-07-03
**Archive Path**: `openspec/changes/archive/2026-07-03-controller-decorators-docker/`

## Two Workstreams

### WS-1: Controller Decorators (COU-114)
Eliminated the `@Req() req: any` anti-pattern across 7 controllers by creating two typed param decorators:
- `@CurrentUser()` — extracts the authenticated User entity from `request.user` (JWT/Passport)
- `@RequestLang()` — extracts the 2-char request language code, delegating to existing `getRequestLang()`

Also fixed:
- Route ordering bug in `user.controller.ts` (`@Get(':id')` was before `@Get()`)
- Added `@Exclude()` on `User.password` for defense-in-depth serialization protection

### WS-2: Docker Hardening
Restructured the Dockerfile production stage to use `npm ci --omit=dev` with a fresh dependency install instead of copying `node_modules` from the build stage, eliminating devDependencies from the production image.

## Key Metrics

| Metric | Value |
|--------|-------|
| Tests | 324 passing, 0 failures |
| Type Errors | 0 (tsc --noEmit clean) |
| Lint Warnings | 23 pre-existing, 0 introduced |
| Files Modified | 15 source + 2 new test files |
| Changed Lines | ~250-300 |
| Spec Requirements | 10 applicable (9 PASS, 1 SKIPPED) |
| Tasks | 20/20 complete |
| Controllers Refactored | 7 (auth, user-profile, user, audit, i18n-admin, rbac-role, rbac-permission) |
| @Req() Usages Replaced | 17 across 7 controllers |
| New Decorators | 2 (@CurrentUser, @RequestLang) |

## SDD Phases Completed

| Phase | Artifact | Engram ID | Status |
|-------|----------|-----------|--------|
| Explore | `exploration.md` | #1056 | ✅ |
| Proposal | `proposal.md` | #1057 | ✅ |
| Spec | `specs/` (controllers + docker) | #1058 | ✅ |
| Design | `design.md` | #1059 | ✅ |
| Tasks | `tasks.md` | #1060 | ✅ |
| Apply | `apply-progress` | #1061 | ✅ |
| Verify | `verify-report.md` | #1062 | ✅ PASS |
| Archive | `archive-report.md` | *(this)* | ✅ |

## Specs Synced to Main

| Domain | Action | Details |
|--------|--------|---------|
| `controllers` | **Created** (new domain) | 6 requirements: CTR-01 through CTR-06 |
| `docker` | **Created** (new domain) | 4 requirements: DOC-01 through DOC-04 |

## Archive Contents

- `exploration.md` ✅
- `proposal.md` ✅
- `specs/controllers/spec.md` ✅
- `specs/docker/spec.md` ✅
- `design.md` ✅
- `tasks.md` ✅ (20/20 tasks checked)
- `verify-report.md` ✅ (PASS)
- `archive-report.md` ✅

## Source of Truth Updated

The following main specs now reflect the new behavior:
- `openspec/specs/controllers/spec.md` — @CurrentUser(), @RequestLang(), route ordering, password exclusion
- `openspec/specs/docker/spec.md` — production-only dependencies, npm ci --omit=dev, build resilience

## Lessons Learned

1. **`createParamDecorator` factory signature**: The factory receives `(data, ctx)` — helper functions must accept both parameters even when `data` is unused.
2. **`@Request()` vs `@Req()`**: Both are NestJS aliases for the same decorator — `user-profile.controller.ts` used `@Request()` while others used `@Req()`.
3. **Private `t()` helper signature change**: Controllers with a private `t(key, req)` translation helper needed their signature changed to `t(key, lang)` — a cascading change across auth, user-profile, user, and audit controllers.
4. **`dist/` ownership**: The `dist/` directory is owned by the `node` user from Docker builds, causing `tsc` `tsBuildInfo` permission issues on the host (environment artifact, not a code issue).
5. **MongoMemoryServer flaky timeouts**: Pre-existing flaky test in `audit.module.spec.ts` — not caused by this change.
6. **Route ordering matters**: Fastify/NestJS route registration order determines matching — `@Get(':id')` before `@Get()` causes `/admin/users` to match with `id="users"`.

## Verification Warnings

- **W-1**: DOC-03 (image size reduction) not verifiable without Docker build environment
- **W-2**: `dist/` EACCES from `tsc` is a Docker environment artifact, not a code issue

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
