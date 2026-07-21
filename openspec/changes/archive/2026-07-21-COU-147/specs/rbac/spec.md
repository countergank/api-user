# Delta for rbac-cache + rbac

## rbac-cache — Full Spec (New Capability)

### Purpose

Cache-aside layer for RoleService and PermissionService with TTL-based expiry and mutation-driven invalidation.

---

### Requirement: RoleService read-path caching

The system MUST use cache-aside for `RoleService.findAll()` and `RoleService.findByName()`. Cache keys: `rbac:roles:all`, `rbac:roles:name:{name}`. TTL: 10 minutes.

#### Scenario: findAll cache hit

- GIVEN roles exist in the database and cache is populated
- WHEN `findAll()` is called a second time
- THEN the cached roles are returned without a database query

#### Scenario: findAll cache miss

- GIVEN the cache is empty for roles
- WHEN `findAll()` is called
- THEN the database is queried, the result is cached, and roles are returned

#### Scenario: findByName cache hit

- GIVEN a role "ADMIN" is cached under `rbac:roles:name:ADMIN`
- WHEN `findByName("ADMIN")` is called
- THEN the cached role is returned without a database query

#### Scenario: findByName cache miss

- GIVEN the cache does not contain `rbac:roles:name:ADMIN`
- WHEN `findByName("ADMIN")` is called
- THEN the database is queried, the result is cached, and the role is returned

---

### Requirement: RoleService write-path invalidation

The system MUST invalidate role caches on mutations: `create()` invalidates `rbac:roles:all` via `del`; `updatePermissions()` invalidates `rbac:roles:all` and `rbac:roles:name:{name}` via `delByPattern`.

#### Scenario: create invalidates list cache

- GIVEN role caches are populated
- WHEN `create()` completes successfully
- THEN `rbac:roles:all` is deleted from cache

#### Scenario: updatePermissions invalidates all role caches

- GIVEN role caches are populated including `rbac:roles:name:ADMIN`
- WHEN `updatePermissions("ADMIN", ...)` completes
- THEN all keys matching `rbac:roles:*` are deleted from cache

---

### Requirement: PermissionService read-path caching

The system MUST use cache-aside for `PermissionService.findAll()`, `PermissionService.findByNames()`, and `PermissionService.findByName()`. Cache keys: `rbac:permissions:all`, `rbac:permissions:name:{name}`. TTL: 15 minutes.

#### Scenario: findAll cache hit

- GIVEN permissions exist and cache is populated
- WHEN `findAll()` is called a second time
- THEN the cached permissions are returned without a database query

#### Scenario: findByNames returns subset from cache

- GIVEN permissions `["read", "write"]` are cached individually
- WHEN `findByNames(["read", "write"])` is called
- THEN each permission is resolved from cache without a database query

#### Scenario: findByNames partial miss

- GIVEN only `read` is cached, `write` is not
- WHEN `findByNames(["read", "write"])` is called
- THEN `read` is returned from cache and `write` is queried from the database

#### Scenario: findByName cache hit

- GIVEN `rbac:permissions:name:read` is cached
- WHEN `findByName("read")` is called
- THEN the cached permission is returned without a database query

---

### Requirement: PermissionService write-path invalidation

The system MUST invalidate permission caches on mutations: `create()` invalidates `rbac:permissions:all` via `del`; `createMany()` invalidates `rbac:permissions:all` via `delByPattern`.

#### Scenario: create invalidates list cache

- GIVEN permission caches are populated
- WHEN `create()` completes successfully
- THEN `rbac:permissions:all` is deleted from cache

#### Scenario: createMany invalidates all permission caches

- GIVEN permission caches are populated
- WHEN `createMany([...])` completes
- THEN all keys matching `rbac:permissions:*` are deleted from cache

---

### Requirement: Graceful degradation

The system MUST fall through to the database on cache miss or cache service failure. A cache error MUST NOT prevent the service from returning data.

#### Scenario: cache service unavailable

- GIVEN the cache service throws an error
- WHEN a read-path method is called
- THEN the database is queried and the result is returned successfully

---

## rbac — Delta (Modified Capability)

### MODIFIED Requirements

### Requirement: RBAC module dependencies

The RBAC module MUST import `CacheModule` and inject `CacheService` into `RoleService` and `PermissionService`.

(Previously: RBAC module had no cache dependency.)

#### Scenario: module loads with CacheModule

- GIVEN `RbacModule` is configured
- WHEN the application bootstraps
- THEN `RoleService` and `PermissionService` have `CacheService` injected

#### Scenario: backward compatibility

- GIVEN `RbacModule` is imported by another module
- WHEN the consuming module uses `RoleService` or `PermissionService`
- THEN the service API surface is unchanged (no breaking changes)
