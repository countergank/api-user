# Proposal: Admin User CRUD — Complete Admin Operations

## Intent

`UserController` currently supports only create, single lookup, and unfiltered full listing. Missing operations are update, soft-delete, activate/deactivate toggle, and paginated/filtered/searchable listing. This change delivers the complete admin user management surface (Feature #2 from backlog, GitHub #241, #242).

## Scope

### In Scope
- `PATCH /admin/users/:id` — partial update (name, lastName, email, userName, role, permissions) with uniqueness validation, returns `UserDTO`
- `DELETE /admin/users/:id` — soft delete (isActive=false + deletedAt timestamp), idempotent
- `PATCH /admin/users/:id/active` — isActive toggle; rejects soft-deleted users
- `GET /admin/users` with pagination — query params: page, limit, sortBy, sortOrder, role, isActive, search (across name, lastName, email, userName); response `{ data, total, page, limit, totalPages }`
- New DTOs: `UpdateUserDTO`, `PaginatedUserResponseDTO`, `PaginationQueryDTO`
- API doc decorators for all new endpoints + updated examples

### Out of Scope
- Bulk operations, role/permission CRUD (Feature #4), audit logging (Feature #3), password updates via admin

## Capabilities

### New Capabilities
- **`admin-user-update`**: PATCH endpoint updates allowed user fields; validates email/userName uniqueness excluding self
- **`admin-user-delete`**: Soft-delete via DELETE; sets isActive=false + deletedAt; idempotent
- **`admin-user-toggle-active`**: Dedicated PATCH flips isActive; returns 400 if `deletedAt` is set
- **`admin-user-pagination`**: Enhanced GET with filtering, text search, sort, and pagination envelope

### Modified Capabilities
- None — existing endpoints retain identical behavior; `GET /` returns `UserDTO[]` when no pagination params present

## Approach

**Entity**: Add optional `deletedAt?: Date` to `User`. Mongoose schema picks it up automatically.

**DTOs**: `UpdateUserDTO = PartialType(OmitType(CreateUserDTO, ['password']))` with all fields optional. `PaginatedUserResponseDTO` wraps `data: UserDTO[]` + metadata.

**Repository**: Add `findPaginated(filters)` building Mongoose query with `$or` regex search, role/isActive filters, sort, skip/limit, `countDocuments`. Add `softDelete(id)` setting isActive=false + deletedAt.

**Service**: Add `updateUser()`, `deleteUser()`, `toggleActive()`, `findPaginated()`. Reuse existing `update()` under the hood. Validate uniqueness on update (exclude self). Add `UserAlreadyDeletedError` for toggle-on-deleted attempts.

**Controller**: Four new endpoints. Enhance existing `findAll()`: when `page` query param is absent → return `UserDTO[]` (backward compat); when present → return `PaginatedUserResponseDTO`.

**API docs**: New decorator functions in `user.decorator.ts` following existing `applyDecorators` pattern. Add `PaginatedUserResponse` Swagger example.

**Errors**: Add error codes `005` (user already deleted) and `006` (cannot activate deleted user) to error dictionary, plus corresponding `ErrorBase` classes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/user/entities/user.entity.ts` | Modified | Add `deletedAt?: Date` |
| `src/user/dto/` | New | `UpdateUserDTO`, `PaginatedUserResponseDTO`, `PaginationQueryDTO` |
| `src/user/repository/user.repository.ts` | Modified | Add `findPaginated()`, `softDelete()` |
| `src/user/service/user.service.ts` | Modified | Add 4 methods; reuse existing `update()` |
| `src/user/controller/user.controller.ts` | Modified | 4 new endpoints + enhanced GET |
| `src/user/api-docs/user.decorator.ts` | Modified | 4 new decorators |
| `src/user/api-docs/examples/user.examples.ts` | Modified | Add `PaginatedUserResponse` |
| `src/user/errors/error.dictionary.ts` | Modified | New codes 005, 006 |
| `src/user/errors/error-instances.error.ts` | Modified | `UserAlreadyDeletedError` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Backward compat: existing `GET /` consumers break on new response shape | Low | Paginated envelope only when `page` param present; plain `[]` otherwise |
| Uniqueness race on update | Low | Mongoose unique index as final guard; app-level check as fast path |
| Soft-deleted vs inactive ambiguity | Medium | `deletedAt` discriminates permanently-deleted from deactivated; toggle endpoint checks `deletedAt` |

## Rollback Plan

Revert `feature/admin-crud` branch. If `deletedAt` field already deployed to DB, run: `db.users.updateMany({}, { $unset: { deletedAt: "" } })`.

## Dependencies

None — no new npm packages, external services, or upstream changes required.

## Success Criteria

- [ ] `PATCH /admin/users/:id` returns updated `UserDTO`, rejects duplicate email/userName (400), 400 on not found
- [ ] `DELETE /admin/users/:id` sets isActive=false + deletedAt, returns confirmation; idempotent on already-deleted users
- [ ] `PATCH /admin/users/:id/active` flips isActive; returns 400 if user is soft-deleted
- [ ] `GET /admin/users?page=1&limit=10&role=admin&search=juan` returns `{ data, total, page, limit, totalPages }` with correct counts
- [ ] `GET /admin/users` (no params) returns `UserDTO[]` — backward compat preserved
- [ ] All endpoints guarded by JWT + admin role
- [ ] Swagger docs generate correctly
- [ ] Unit + integration tests pass (`npm test`)
