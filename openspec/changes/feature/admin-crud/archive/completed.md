# Archived: admin-crud

Completed on: 2026-05-14
Finalized on: 2026-05-16

## Summary
- PATCH /admin/users/:id — update user with uniqueness validation
- DELETE /admin/users/:id — soft delete (deletedAt)
- PATCH /admin/users/:id/active — toggle isActive
- GET /admin/users — paginated with filters (page, limit, sortBy, sortOrder, role, isActive, search)
- Backward compat: GET /admin/users without page returns UserDTO[]
- 207 unit + 62 e2e tests passing, strict TDD

## Files Changed
- src/user/controller/user.controller.ts — 3 new endpoints + enhanced findAll
- src/user/service/user.service.ts — updateUser, deleteUser, toggleActiveUser, findPaginated
- src/user/repository/user.repository.ts — exclusion methods, softDelete, toggleActive, findPaginated
- src/user/dto/ — UpdateUserDTO, PaginationQueryDTO, PaginatedUserResponseDTO
- src/user/entities/user.entity.ts — deletedAt field
- src/user/errors/ — UserAlreadyDeletedError (code 005)

## Out-of-Scope Work (post-implementation)

### i18n — Full internationalization
- All endpoint success messages internationalized (es/en/pt): forgot_password_sent, password_reset_success, email_verified, email_changed, password_changed, email_change_sent, verification_resent, account_unlocked, user_deleted, translations_reloaded
- All error messages moved from natural language to i18n codes: INVALID_CREDENTIALS, ACCOUNT_INACTIVE, EMAIL_OR_USERNAME_EXISTS, INVALID_REFRESH_TOKEN, NO_PENDING_EMAIL_CHANGE, CURRENT_PASSWORD_INCORRECT, INVALID_USER_ID, EXPIRED_RESET_TOKEN, EXPIRED_VERIFICATION_TOKEN, EXPIRED_CONFIRMATION_TOKEN
- Pagination validation errors: PAGE_MIN, LIMIT_MIN, LIMIT_MAX, SORT_BY_INVALID, SORT_ORDER_INVALID, IS_ACTIVE_BOOLEAN
- I18nModule made @Global() for cross-module injection
- I18nService: onModuleInit loads JSON → MongoDB → merge new keys
- I18nService: reloadFromMongo now merges JSON keys post-MongoDB load
- nest-cli.json: assets config to copy i18n JSON files to dist/

### Bug Fixes
- **lockedUntil not cleared**: undefined values were stripped by Object.fromEntries filter → use null instead
- **isActive filter broken**: enableImplicitConversion converted 'false' → true → fixed with @Type(() => String) + manual @Transform
- **deletedAt blocked isActive=false filter**: soft-delete sets both isActive=false AND deletedAt → only exclude deletedAt when no isActive filter
- **CastError → 500**: invalid MongoDB ObjectId threw uncaught CastError → catch in all admin endpoints, return 400 with INVALID_USER_ID
- **CreateUserDTO role default leaked to UpdateUserDTO**: removed TypeScript default, fallback in toEntity()

## Notes
- Soft delete uses deletedAt discriminator (distinct from isActive)
- Pagination is opt-in: page param triggers paginated envelope
- 269 tests passing (207 unit + 62 e2e)
- Uncommitted changes pending user approval
