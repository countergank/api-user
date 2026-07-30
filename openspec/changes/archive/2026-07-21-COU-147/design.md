# Design: RBAC Cache — Cache de roles y permisos

## Technical Approach

Cache-aside in `RoleService` and `PermissionService` following the exact pattern established in `AuthService.validateUser()` (read path) and `UserService.invalidateUserCache()` (write path). `CacheModule` is already `@Global`, so no module import changes needed in `RbacModule`.

## Architecture Decisions

| Decision | Option A | Option B | Tradeoff | Decision |
|----------|----------|----------|----------|----------|
| Module wiring | Import CacheModule in RbacModule | Rely on @Global | A is explicit, B is implicit | B — CacheModule is @Global, importing it again is redundant noise. Matches how AuthService uses it without any import. |
| Cache strategy | Cache-aside (manual get/set) | Write-through or cache decorator | A is simple & matches codebase pattern; B adds abstraction not yet established | A — follows AuthService/UserService precedent, no new abstractions |
| Invalidation scope for updatePermissions | delByPattern all role keys | Targeted del of specific name key | A is safer (permissions changed → role name caches stale); B is cheaper | A — permission list changes affect all role lookups |
| findByNames cache | Individual per-name keys | Single composite key per name list | A reuses per-name entries across calls; B is simpler but less reusable | A — individual keys composed from existing name-key pattern |

## Data Flow

```
Request ──→ RoleService/PermissionService
                │
                ├── cache.get(key) ──HIT──→ return cached
                │       │
                │      MISS
                │       │
                │       ▼
                │   Mongoose query
                │       │
                │       ▼
                │   cache.set(key, result, ttl)
                │       │
                └───────┘
                   return result

Mutation ──→ Service method
                │
                ▼
            Mongoose write
                │
                ▼
            cache.del / cache.delByPattern
                │
                ▼
            return updated entity
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/rbac/services/role.service.ts` | Modify | Inject CacheService; add cache-aside to findAll, findByName, findByNames, findById, getPermissionsForRole; add invalidation to create, updatePermissions |
| `src/rbac/services/permission.service.ts` | Modify | Inject CacheService; add cache-aside to findAll, findByName, findByNames, findByIds; add invalidation to create, createMany |
| `src/rbac/services/role.service.spec.ts` | Create | Unit tests: cache hits, cache misses, invalidation on create/updatePermissions, graceful degradation |
| `src/rbac/services/permission.service.spec.ts` | Create | Unit tests: cache hits, cache misses, invalidation on create/createMany, graceful degradation |

## Cache Key Design

| Key Pattern | TTL | Source | Invalidation |
|------------|-----|--------|-------------|
| `rbac:roles:all` | 10 min (600 000 ms) | `RoleService.findAll()` | `del` on create; `delByPattern` on updatePermissions |
| `rbac:roles:name:{name}` | 10 min | `RoleService.findByName()` | `delByPattern('cache:rbac:roles:name:*')` on updatePermissions |
| `rbac:permissions:all` | 15 min (900 000 ms) | `PermissionService.findAll()` | `del` on create; `delByPattern` on createMany |
| `rbac:permissions:name:{name}` | 15 min | `PermissionService.findByName()` | `delByPattern('cache:rbac:permissions:name:*')` on createMany |

Note: `CacheService` auto-prefixes with `cache:`, so actual Redis keys are `cache:rbac:roles:all`, etc.

## Invalidation Flow

**RoleService:**
- `create()` → `cache.del('rbac:roles:all')` — new role won't appear in list until TTL or next query
- `updatePermissions(roleId, ...)` → `cache.delByPattern('cache:rbac:roles:*')` — permissions changed, all cached role data may be stale

**PermissionService:**
- `create()` → `cache.del('rbac:permissions:all')` — new permission won't appear in list
- `createMany()` → `cache.delByPattern('cache:rbac:permissions:*')` — bulk insert, invalidate all

## Error Handling

`CacheService.get()` already returns `undefined` on error (graceful degradation built-in). `CacheService.set()` and `CacheService.del()` swallow errors with logging. No additional try/catch needed in services — the existing CacheService contract guarantees cache failures never propagate to callers.

## Interfaces / Contracts

No new interfaces. Services keep their existing public API. Cache is internal implementation detail.

```typescript
// RoleService — injected dependency (constructor change only)
constructor(
  @InjectModel(Role.name) private roleModel: Model<Role>,
  private readonly cacheService: CacheService,  // NEW
) {}

// PermissionService — same pattern
constructor(
  @InjectModel(Permission.name) private permissionModel: Model<Permission>,
  private readonly cacheService: CacheService,  // NEW
) {}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Cache hit returns cached data without DB call | Mock CacheService.get to return data, spy on model.find — assert model not called |
| Unit | Cache miss queries DB and populates cache | Mock CacheService.get to return undefined, assert cache.set called with correct key/TTL |
| Unit | Invalidation on create/updatePermissions/createMany | Assert cache.del or cache.delByPattern called with correct keys after mutation |
| Unit | Graceful degradation | Mock CacheService.get to throw, assert DB query still executes and returns data |
| Unit | findByNames partial cache miss | Mock get to return data for some names, undefined for others — assert only missing names hit DB |

Test pattern: follow `auth.service.spec.ts` and `user.service.spec.ts` conventions — `@nestjs/testing` Test module, `.useMocker()` with `CacheService` token match, jest.fn() mocks.

## Migration / Rollout

No migration required. All changes are additive — original Mongoose queries are preserved. Cache is a transparent optimization layer. TTL provides automatic staleness correction.

## Open Questions

- [ ] None — all decisions resolved by following established patterns
