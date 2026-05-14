# Archived: admin-crud

Completed on: 2026-05-14

## Summary
- PATCH /admin/users/:id — update user with uniqueness validation
- DELETE /admin/users/:id — soft delete (deletedAt)
- PATCH /admin/users/:id/active — toggle isActive
- GET /admin/users — paginated with filters (page, limit, sortBy, sortOrder, role, isActive, search)
- Backward compat: GET /admin/users without page returns UserDTO[]
- 207 unit tests passing, strict TDD

## Files Changed
- src/user/controller/user.controller.ts — 3 new endpoints + enhanced findAll
- src/user/service/user.service.ts — updateUser, deleteUser, toggleActiveUser, findPaginated
- src/user/repository/user.repository.ts — exclusion methods, softDelete, toggleActive, findPaginated
- src/user/dto/ — UpdateUserDTO, PaginationQueryDTO, PaginatedUserResponseDTO
- src/user/entities/user.entity.ts — deletedAt field
- src/user/errors/ — UserAlreadyDeletedError (code 005)

## Notes
- Soft delete uses deletedAt discriminator (distinct from isActive)
- Pagination is opt-in: page param triggers paginated envelope
