# Changelog: COU-147 — RBAC Cache

## Summary

Cache-aside layer for `RoleService` and `PermissionService` following the established `CacheService` + Redis pattern (COU-146).

## What Was Done

### RoleService Cache-Aside
- Injected `CacheService` via constructor
- `findAll()` — cache key `rbac:roles:all`, TTL 600000 ms (10 min)
- `findByName()` — cache key `rbac:roles:name:{name}`, TTL 600000 ms
- `findByNames()` — per-name cache lookups; DB only for missing names
- `getPermissionsForRole()` — benefits from cached `findByName` automatically
- **Invalidation**: `create()` deletes `rbac:roles:all`; `updatePermissions()` deletes all `rbac:roles:*` via `delByPattern`

### PermissionService Cache-Aside
- Injected `CacheService` via constructor
- `findAll()` — cache key `rbac:permissions:all`, TTL 900000 ms (15 min)
- `findByName()` — cache key `rbac:permissions:name:{name}`, TTL 900000 ms
- `findByNames()` — per-name cache lookups; DB only for missing names
- **Invalidation**: `create()` deletes `rbac:permissions:all`; `createMany()` deletes all `rbac:permissions:*` via `delByPattern`

### Test Coverage
- 34 RBAC-specific tests (17 role, 17 permission)
- 423 total tests passing
- Cache hits, misses, invalidation, graceful degradation, edge cases all verified

### Files Changed
- `src/rbac/services/role.service.ts` — CacheService injection + cache-aside logic
- `src/rbac/services/role.service.spec.ts` — 17 unit tests (new)
- `src/rbac/services/permission.service.ts` — CacheService injection + cache-aside logic
- `src/rbac/services/permission.service.spec.ts` — 17 unit tests (new)

## Cache Key Design

| Key Pattern | TTL | Service |
|-------------|-----|---------|
| `rbac:roles:all` | 10 min | RoleService.findAll() |
| `rbac:roles:name:{name}` | 10 min | RoleService.findByName() |
| `rbac:permissions:all` | 15 min | PermissionService.findAll() |
| `rbac:permissions:name:{name}` | 15 min | PermissionService.findByName() |

## Dependencies

- `CacheService` + `CacheModule` (already available from `src/config/cache/`)
- `CacheModule` is `@Global` — no module wiring changes needed in `RbacModule`
