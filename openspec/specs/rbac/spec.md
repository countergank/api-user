# rbac Specification

> Migrated from `openspec/SPEC.md` (deleted 2026-07-06).
> Updated by COU-147 (2026-07-21): Added RBAC module cache dependency.

## Overview

Role-Based Access Control with three roles: USER, ADMIN, VIEWER.

---

### Requirement: RBAC module dependencies

The RBAC module MUST import `CacheModule` and inject `CacheService` into `RoleService` and `PermissionService`.

#### Scenario: module loads with CacheModule

- GIVEN `RbacModule` is configured
- WHEN the application bootstraps
- THEN `RoleService` and `PermissionService` have `CacheService` injected

#### Scenario: backward compatibility

- GIVEN `RbacModule` is imported by another module
- WHEN the consuming module uses `RoleService` or `PermissionService`
- THEN the service API surface is unchanged (no breaking changes)
