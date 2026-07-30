# Tasks: RBAC Cache — Cache de roles y permisos

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 240–300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

---

## Phase 1: RoleService Cache-Aside (RED → GREEN)

- [x] 1.1 RED — Create `src/rbac/services/role.service.spec.ts`. Write failing test: `findAll()` cache hit — mock `CacheService.get('rbac:roles:all')` returning cached array, spy on `roleModel.find` — assert find NOT called.
- [x] 1.2 GREEN — In `src/rbac/services/role.service.ts`: inject `CacheService` via constructor; wrap `findAll()` with cache-aside using key `rbac:roles:all`, TTL 600000 ms.
- [x] 1.3 RED — Add failing test: `findByName()` cache hit — mock get to return cached role, assert model.findOne NOT called.
- [x] 1.4 GREEN — Wrap `findByName(name)` with cache-aside using key `rbac:roles:name:{name}`, TTL 600000 ms.
- [x] 1.5 RED — Add failing test: cache miss path — mock get returns `undefined`, assert `cache.set()` called with correct key and TTL.
- [x] 1.6 GREEN — Verify cache-aside miss logic: query DB, then `cache.set(key, result, 600000)`.
- [x] 1.7 RED — Add failing test: `findByNames()` composes individual name keys, DB only for missing names.
- [x] 1.8 GREEN — Wrap `findByNames(names)` with per-name cache lookups; query DB only for names not in cache.
- [x] 1.9 RED — Add failing test: `getPermissionsForRole()` returns cached permissionIds via `findByName` cache.
- [x] 1.10 GREEN — Verify `getPermissionsForRole` benefits from cached `findByName` automatically (no extra cache logic needed).

## Phase 2: PermissionService Cache-Aside (RED → GREEN)

- [x] 2.1 RED — Create `src/rbac/services/permission.service.spec.ts`. Write failing test: `findAll()` cache hit — mock get returning cached array, assert model.find NOT called.
- [x] 2.2 GREEN — In `src/rbac/services/permission.service.ts`: inject `CacheService` via constructor; wrap `findAll()` with key `rbac:permissions:all`, TTL 900000 ms.
- [x] 2.3 RED — Add failing test: `findByName()` cache hit — mock get to return cached permission.
- [x] 2.4 GREEN — Wrap `findByName(name)` with key `rbac:permissions:name:{name}`, TTL 900000 ms.
- [x] 2.5 RED — Add failing test: `findByNames()` composes per-name keys, DB only for misses.
- [x] 2.6 GREEN — Wrap `findByNames(names)` with per-name cache lookups.
- [x] 2.7 RED — Add failing test: cache miss populates cache with correct TTL.
- [x] 2.8 GREEN — Verify `cache.set` called with 900000 ms TTL on miss paths.

## Phase 3: Invalidation — Write Methods (RED → GREEN)

- [x] 3.1 RED — RoleService spec: failing test `create()` calls `cache.del('rbac:roles:all')` after save.
- [x] 3.2 GREEN — Add `cache.del('rbac:roles:all')` after `role.save()` in `create()`.
- [x] 3.3 RED — RoleService spec: failing test `updatePermissions()` calls `cache.delByPattern('rbac:roles:*')` after update.
- [x] 3.4 GREEN — Add `cache.delByPattern('rbac:roles:*')` after `findByIdAndUpdate` in `updatePermissions()`.
- [x] 3.5 RED — PermissionService spec: failing test `create()` calls `cache.del('rbac:permissions:all')` after save.
- [x] 3.6 GREEN — Add `cache.del('rbac:permissions:all')` after `permission.save()` in `create()`.
- [x] 3.7 RED — PermissionService spec: failing test `createMany()` calls `cache.delByPattern('rbac:permissions:*')` after insert.
- [x] 3.8 GREEN — Add `cache.delByPattern('rbac:permissions:*')` after `insertMany` in `createMany()`.

## Phase 4: Graceful Degradation & Triangulation

- [x] 4.1 RED — RoleService spec: mock `CacheService.get` to throw, assert DB query still executes and returns data.
- [x] 4.2 GREEN — Verify no additional try/catch needed (CacheService.get returns undefined on error per contract).
- [x] 4.3 RED — PermissionService spec: same degradation test — get throws, DB query succeeds.
- [x] 4.4 GREEN — Verify degradation works via CacheService contract.
- [x] 4.5 TRIANGULATE — Add edge case tests: empty array results cached correctly, null findByName results cached, concurrent invalidation during read.

## Phase 5: Verify & Clean

- [x] 5.1 Run full test suite: `npm test` — all existing + new tests pass.
- [x] 5.2 Verify no module wiring changes needed in `rbac.module.ts` (CacheModule is @Global).
- [x] 5.3 Confirm all 4 cache key patterns and TTLs match design spec exactly.
