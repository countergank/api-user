# Proposal: RBAC Cache — Cache de roles y permisos

## Intent

RoleService and PermissionService query MongoDB on every request with zero caching. As the admin management layer grows and future auth-flow integration is planned, these queries become a latency and load liability. This change adds cache-aside to both services following the established COU-146 pattern (`CacheService` + Redis).

## Scope

### In Scope
- Inject `CacheService` into `RoleService` and `PermissionService`
- Cache-aside for `RoleService`: `findAll()`, `findByName()`, `findById()`, `findByNames()`, `getPermissionsForRole()`
- Cache-aside for `PermissionService`: `findAll()`, `findByName()`, `findByNames()`, `findByIds()`
- Invalidation in `RoleService`: `create()`, `updatePermissions()`
- Invalidation in `PermissionService`: `create()`, `createMany()`
- Unit tests for both services (cache hits, misses, invalidation)
- Import `CacheModule` in `RbacModule`

### Out of Scope
- Modifying guard runtime behavior (guards already read cached User doc via COU-146)
- Cache decorator or interceptor abstractions
- Redis cluster / distributed cache concerns
- RBAC spec enrichment beyond caching behavior

## Capabilities

### New Capabilities
- `rbac-cache`: Cache-aside layer for RoleService and PermissionService with TTL-based expiry and mutation-driven invalidation

### Modified Capabilities
- `rbac`: RBAC module now depends on CacheModule; service read paths are cached

## Approach

Cache-aside pattern, identical to `auth.service.ts`:

1. Add `CacheModule` import to `RbacModule`
2. Inject `CacheService` into both services
3. **Read path**: check cache → miss → query DB → populate cache
4. **Write path**: execute mutation → invalidate relevant keys
5. Cache keys follow `rbac:roles:*` / `rbac:permissions:*` namespace
6. TTL: 10 min roles (`600_000` ms), 15 min permissions (`900_000` ms)
7. Invalidation: `del()` for targeted keys, `delByPattern('cache:rbac:roles:*')` for bulk role changes

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/rbac/services/role.service.ts` | Modified | Add CacheService injection + cache-aside logic |
| `src/rbac/services/permission.service.ts` | Modified | Add CacheService injection + cache-aside logic |
| `src/rbac/rbac.module.ts` | Modified | Add CacheModule import |
| `src/rbac/services/role.service.spec.ts` | New | Unit tests for cached RoleService |
| `src/rbac/services/permission.service.spec.ts` | New | Unit tests for cached PermissionService |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stale role/permission data served from cache after admin mutation | Medium | Invalidation on every write path; TTL as safety net |
| Cache key collision with COU-146 `user:` namespace | Low | `rbac:` prefix separates namespaces cleanly |
| `delByPattern` performance on large key sets | Low | SCAN-based iteration with COUNT=100, non-blocking |

## Rollback Plan

1. Remove `CacheModule` import from `RbacModule`
2. Remove `CacheService` injection from both services
3. Revert service methods to direct Mongoose queries (no caching logic)
4. Delete new spec files

All changes are additive — original Mongoose queries are preserved in each method. Rollback restores the exact pre-change behavior.

## Dependencies

- `CacheService` + `CacheModule` (already available from `src/config/cache/`)
- `RedisService` (already wired globally via `CacheModule`)

## Success Criteria

- [ ] `RoleService.findAll()` and `findByName()` return cached results on second call (no DB hit)
- [ ] `PermissionService.findAll()` and `findByName()` return cached results on second call
- [ ] Cache is invalidated after `create()`, `updatePermissions()`, `createMany()` mutations
- [ ] All unit tests pass with mocked `CacheService`
- [ ] No module wiring changes needed beyond `RbacModule` import
