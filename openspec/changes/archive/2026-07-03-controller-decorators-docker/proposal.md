# Proposal: Controller Decorators & Docker Hardening

## Intent

Eliminate `@Req() req: any` anti-pattern across 7 controllers by introducing typed `@CurrentUser()` and `@RequestLang()` param decorators, fix a route ordering bug in `user.controller.ts`, and harden the Docker production image to exclude dev dependencies.

## Scope

### In Scope
- Create `@CurrentUser()` decorator — replaces 4 `@Request() req` + `req.user` accesses in `user-profile.controller.ts`
- Create `@RequestLang()` decorator — replaces 13 `@Req() req: any` usages used only for `getRequestLang(req)`
- Fix route ordering: move `@Get()` before `@Get(':id')` in `user.controller.ts`
- Restructure Dockerfile production stage: fresh `npm ci --omit=dev` instead of copying dev-tainted `node_modules`
- Add `@Exclude()` to `User.password` for defense-in-depth

### Out of Scope
- `ClassSerializerInterceptor` adoption (separate serialization refactor)
- Node.js 18 → 20 base image bump (deferred to infrastructure cycle)
- `UserDTO.of()` → auto-serialization migration
- Any controller logic changes beyond decorator replacement

## Capabilities

### New Capabilities
- `controller-decorators`: Custom param decorators (`@CurrentUser()`, `@RequestLang()`) for typed access to authenticated user and request language
- `docker-production-hardening`: Production Docker image excludes dev dependencies via isolated `npm ci --omit=dev`

### Modified Capabilities
- None — no existing spec-level behavior changes. Route ordering fix corrects a bug, not a spec change.

## Approach

**WS-4 (Decorators)**: Two new param decorators in `src/common/decorators/`. `@CurrentUser()` extracts `request.user` (typed as `User` entity from JWT strategy). `@RequestLang()` delegates to existing `getRequestLang()` helper, returning `string | undefined`. Replace all `@Req() req: any` usages. Fix GET route order in `user.controller.ts`.

**WS-5 (Docker)**: Production stage gets its own `npm ci --omit=dev` instead of inheriting `node_modules` from the build stage (which was copied from development with all deps). Copy only `dist/` from build.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/common/decorators/current-user.decorator.ts` | New | `@CurrentUser()` param decorator |
| `src/common/decorators/request-lang.decorator.ts` | New | `@RequestLang()` param decorator |
| `src/user/controller/user-profile.controller.ts` | Modified | Replace `@Request()` → `@CurrentUser()` + `@RequestLang()` (4 handlers) |
| `src/user/controller/user.controller.ts` | Modified | Fix `@Get()` ordering; replace `@Req()` → `@RequestLang()` (2 handlers) |
| `src/auth/auth.controller.ts` | Modified | Replace `@Req()` → `@RequestLang()` (6 handlers) |
| `src/rbac/controllers/role.controller.ts` | Modified | Replace `@Req()` → `@RequestLang()` (2 handlers) |
| `src/rbac/controllers/permission.controller.ts` | Modified | Replace `@Req()` → `@RequestLang()` (1 handler) |
| `src/common/audit/audit.controller.ts` | Modified | Remove unused `@Req() _req` |
| `src/common/i18n/i18n-admin.controller.ts` | Modified | Replace `@Req()` → `@RequestLang()` (1 handler) |
| `src/user/entities/user.entity.ts` | Modified | Add `@Exclude()` to password field |
| `Dockerfile` | Modified | Production stage: fresh `npm ci --omit=dev` |
| Tests (all affected controllers) | Modified | Update mock request patterns |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `@RequestLang()` behavior differs from `getRequestLang()` helper | Low | Delegate to existing helper; decorator wraps it directly |
| Route ordering fix breaks existing clients | Low | `GET /admin/users` matching `:id` was already broken; fix restores correct behavior |
| Test mocks need updates for new decorators | Medium | Update test mocks to use decorator return values instead of `req.user` |
| Docker two-install increases build time | Low | ~10-20s overhead; acceptable for smaller production image |

## Rollback Plan

1. **Decorators**: Revert git commit. All `@CurrentUser()` / `@RequestLang()` usages return to `@Request() req` / `@Req() req: any` — behavior identical. New decorator files can remain (unused) or be deleted.
2. **Route ordering**: Revert commit. Routes return to previous order (bug restored, but no data loss).
3. **Dockerfile**: Revert commit. Production image returns to previous state (larger but functional). No runtime behavior change.

All changes are non-breaking at the API level. Full `git revert` of the merge commit restores previous state.

## Dependencies

- None. Cycle 2 touches files independent of Cycle 1 (health check, security specs).
- Requires `class-transformer` (already installed) for `@Exclude()` on User entity.

## Success Criteria

- [ ] Zero `@Req() req: any` patterns remain for `req.user` or `getRequestLang()` access
- [ ] `@Get()` route appears before `@Get(':id')` in `user.controller.ts`
- [ ] Docker production image `node_modules` contains only production dependencies
- [ ] All existing tests pass (`npm test`)
- [ ] `User.password` has `@Exclude()` decorator
