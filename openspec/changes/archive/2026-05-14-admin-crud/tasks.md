# Tasks: Admin User CRUD — Complete Admin Operations

**Change ID:** `admin-crud`  
**Branch:** `feature/admin-crud`  
**Created:** 2026-05-14  
**Total Estimated Lines:** ~850 lines  
**Chained PR Recommended:** YES (exceeds 400-line budget)

---

## Phase 1: Foundation

### 1.1 Add `deletedAt` field to User entity
**Spec References:** Proposal "Entity" section, Design "File Changes"  
**Files:** `src/user/entities/user.entity.ts`  
**Estimated Lines:** ~2 lines  

**Acceptance Criteria:**
- [x] Add `@Prop() deletedAt?: Date` field to User class
- [x] Field is optional (existing documents remain valid)
- [x] Mongoose schema automatically picks up the field

**Dependencies:** None

---

### 1.2 Create UpdateUserDTO
**Spec References:** admin-user-update R1, R2, R6; Design "Interfaces / Contracts"  
**Files:** `src/user/dto/update-user.dto.ts`  
**Estimated Lines:** ~40 lines  

**Acceptance Criteria:**
- [x] Extends `PartialType(OmitType(CreateUserDTO, ['password']))`
- [x] All fields optional: `name`, `lastName`, `email`, `userName`, `role`, `permissions`
- [x] Password field excluded from update
- [x] class-validator decorators inherited from CreateUserDTO
- [x] Swagger `@ApiProperty` decorators included

**Dependencies:** 1.1 (none, but follows entity change)

---

### 1.3 Create PaginationQueryDTO
**Spec References:** admin-user-pagination R1, R6, R7; Design "Interfaces / Contracts"  
**Files:** `src/user/dto/pagination-query.dto.ts`  
**Estimated Lines:** ~50 lines  

**Acceptance Criteria:**
- [x] Query params: `page`, `limit`, `sortBy`, `sortOrder`, `role`, `isActive`, `search`
- [x] Defaults: `page=1`, `limit=20`, `sortBy='createdAt'`, `sortOrder='desc'`
- [x] `@Min(1)` validation on `page` and `limit`
- [x] `@Max(100)` validation on `limit`
- [x] `@IsIn(SORTABLE_FIELDS)` whitelist validation on `sortBy`
- [x] `@IsIn(['asc', 'desc'])` validation on `sortOrder`
- [x] `@Transform` decorator for `isActive` boolean conversion
- [x] SORTABLE_FIELDS constant: `['name','lastName','email','userName','role','isActive','createdAt','updatedAt']`

**Dependencies:** None

---

### 1.4 Create PaginatedUserResponseDTO
**Spec References:** admin-user-pagination R3; Design "Interfaces / Contracts"  
**Files:** `src/user/dto/paginated-user-response.dto.ts`  
**Estimated Lines:** ~30 lines  

**Acceptance Criteria:**
- [x] Generic type parameter `<T = UserDTO>` for reusability
- [x] Properties: `data: T[]`, `total: number`, `page: number`, `limit: number`, `totalPages: number`
- [x] Swagger `@ApiProperty` decorators with correct types
- [x] Static factory method `of(data, total, page, limit)` that calculates `totalPages`

**Dependencies:** 1.2 (UserDTO reference)

---

### 1.5 Add error codes 005 and 006
**Spec References:** admin-user-toggle-active R3; Proposal "Errors" section  
**Files:** `src/user/errors/error.dictionary.ts`, `src/user/errors/error-instances.error.ts`  
**Estimated Lines:** ~35 lines  

**Acceptance Criteria:**
- [x] Add `UserAlreadyDeleted = '005'` to ErrorCodes enum
- [x] Add `Reserved = '006'` to ErrorCodes enum (reserved for future use)
- [x] Add multilingual messages for code 005 in ErrorMessages
- [x] Create `UserAlreadyDeletedError` class extending `ErrorBase`
- [x] Export new error in `UserErrors` array

**Dependencies:** None

---

### 1.6 Create mock files for new DTOs
**Spec References:** Design "File Changes"  
**Files:** `src/user/mocks/update-user-dto.mock.ts`, `src/user/mocks/paginated-user-response.mock.ts`  
**Estimated Lines:** ~45 lines  

**Acceptance Criteria:**
- [x] `UpdateUserDTOMock` extends `UpdateUserDTO` with test data
- [x] `randomize()` method using faker for dynamic data
- [x] `PaginatedUserResponseMock` with sample paginated response
- [x] Consistent with existing mock patterns (CreateUserDTOMock, UserMock)

**Dependencies:** 1.2, 1.4

---

## Phase 2: Implementation

### 2.1 Repository: Add `existsByEmailExcludingSelf` and `existsByNameExcludingSelf`
**Spec References:** admin-user-update R3 (uniqueness self-exclusion)  
**Files:** `src/user/repository/user.repository.ts`  
**Estimated Lines:** ~20 lines  

**Acceptance Criteria:**
- [x] `existsByEmailExcludingSelf(email: string, excludeId: string): Promise<boolean>`
- [x] `existsByNameExcludingSelf(name: string, excludeId: string): Promise<boolean>`
- [x] Query excludes the target user by `_id !== excludeId`
- [x] Returns `true` if another user with same email/name exists

**Dependencies:** 1.1

---

### 2.2 Repository: Add `softDelete` method
**Spec References:** admin-user-delete R2; Design "Data Flow"  
**Files:** `src/user/repository/user.repository.ts`  
**Estimated Lines:** ~10 lines  

**Acceptance Criteria:**
- [x] `softDelete(id: string): Promise<User>`
- [x] Sets `isActive: false` and `deletedAt: new Date()`
- [x] Returns updated user document
- [x] Uses `findByIdAndUpdate` with `{ new: true }`

**Dependencies:** 1.1

---

### 2.3 Repository: Add `findPaginated` method
**Spec References:** admin-user-pagination R1, R4, R5, R6; Design "Data Flow"  
**Files:** `src/user/repository/user.repository.ts`  
**Estimated Lines:** ~60 lines  

**Acceptance Criteria:**
- [x] Accepts filters: `{ page, limit, sortBy, sortOrder, role, isActive, search }`
- [x] Builds MongoDB filter with `$and` logic for combining filters
- [x] Text search uses `$or` regex across `name`, `lastName`, `email`, `userName` (case-insensitive)
- [x] Applies `sortBy` with whitelist validation (returns 400 on invalid field)
- [x] Uses `.skip((page-1)*limit).limit(limit).sort({ [sortBy]: sortOrder })`
- [x] Calls `countDocuments()` for total count
- [x] Returns `{ users: User[], total: number }`
- [x] Filters out soft-deleted users by default (`deletedAt: { $exists: false }`)

**Dependencies:** 1.1, 1.3

---

### 2.4 Service: Add `updateUser` method
**Spec References:** admin-user-update R1-R6; Design "Data Flow"  
**Files:** `src/user/service/user.service.ts`  
**Estimated Lines:** ~30 lines  

**Acceptance Criteria:**
- [x] `updateUser(id: string, dto: UpdateUserDTO): Promise<User>`
- [x] Calls `repository.findById(id)` — throws `UserNotFoundError` if not found
- [x] If `email` in dto: calls `existsByEmailExcludingSelf` — throws `UserEmailAlreadyExistsError` (code 003) on conflict
- [x] If `userName` in dto: calls `existsByNameExcludingSelf` — throws `UserNameAlreadyExistsError` (code 002) on conflict
- [x] Calls `repository.update(id, dto)` and returns result
- [x] Self-exclusion allows updating email/userName to same value

**Dependencies:** 1.2, 2.1

---

### 2.5 Service: Add `deleteUser` method
**Spec References:** admin-user-delete R1-R5; Design "Data Flow"  
**Files:** `src/user/service/user.service.ts`  
**Estimated Lines:** ~20 lines  

**Acceptance Criteria:**
- [x] `deleteUser(id: string): Promise<{ message: string; userId: string }>`
- [x] Calls `repository.findById(id)` — throws `UserNotFoundError` if not found
- [x] If `user.deletedAt` already set: returns idempotent success without modifying
- [x] Otherwise: calls `repository.softDelete(id)`
- [x] Returns `{ message: 'User soft-deleted', userId: id }`

**Dependencies:** 1.1, 2.2

---

### 2.6 Service: Add `toggleActive` method
**Spec References:** admin-user-toggle-active R1-R5; Design "Data Flow"  
**Files:** `src/user/service/user.service.ts`  
**Estimated Lines:** ~20 lines  

**Acceptance Criteria:**
- [x] `toggleActive(id: string): Promise<User>`
- [x] Calls `repository.findById(id)` — throws `UserNotFoundError` if not found
- [x] If `user.deletedAt` set: throws `UserAlreadyDeletedError` (code 005)
- [x] Flips `isActive` boolean: `!user.isActive`
- [x] Calls `repository.update(id, { isActive: newValue })`
- [x] Returns updated user

**Dependencies:** 1.1, 1.5, 2.2

---

### 2.7 Service: Add `findPaginated` method
**Spec References:** admin-user-pagination R1-R5; Design "Data Flow"  
**Files:** `src/user/service/user.service.ts`  
**Estimated Lines:** ~15 lines  

**Acceptance Criteria:**
- [x] `findPaginated(filters: PaginationQueryDTO): Promise<PaginatedUserResponseDTO>`
- [x] Delegates to `repository.findPaginated(filters)`
- [x] Maps result to `PaginatedUserResponseDTO` using factory method
- [x] Calculates `totalPages = Math.ceil(total / limit)`

**Dependencies:** 1.3, 1.4, 2.3

---

### 2.8 Controller: Add `PATCH /admin/users/:id` endpoint
**Spec References:** admin-user-update R1, R4, R5, R7  
**Files:** `src/user/controller/user.controller.ts`  
**Estimated Lines:** ~25 lines  

**Acceptance Criteria:**
- [x] `@Patch(':id')` route
- [x] Accepts `@Body() dto: UpdateUserDTO`
- [x] Calls `userService.updateUser(id, dto)`
- [x] Returns `UserDTO.of(updatedUser)`
- [x] Error handling: `UserNotFoundError` → 400, uniqueness errors → 400, others → 500
- [x] Protected by `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(UserRole.ADMIN)`

**Dependencies:** 1.2, 2.4, 3.1 (decorator)

---

### 2.9 Controller: Add `DELETE /admin/users/:id` endpoint
**Spec References:** admin-user-delete R1, R4, R5, R6  
**Files:** `src/user/controller/user.controller.ts`  
**Estimated Lines:** ~25 lines  

**Acceptance Criteria:**
- [x] `@Delete(':id')` route
- [x] Calls `userService.deleteUser(id)`
- [x] Returns `{ message: string; userId: string }`
- [x] Error handling: `UserNotFoundError` → 400, others → 500
- [x] Idempotent: already-deleted users return success

**Dependencies:** 2.5, 3.2 (decorator)

---

### 2.10 Controller: Add `PATCH /admin/users/:id/active` endpoint
**Spec References:** admin-user-toggle-active R1, R4, R5, R6  
**Files:** `src/user/controller/user.controller.ts`  
**Estimated Lines:** ~25 lines  

**Acceptance Criteria:**
- [x] `@Patch(':id/active')` route
- [x] Calls `userService.toggleActiveUser(id)`
- [x] Returns `UserDTO.of(updatedUser)` with new `isActive` value
- [x] Error handling: `UserNotFoundError` → 400, `UserAlreadyDeletedError` → 400, others → 500

**Dependencies:** 2.6, 3.3 (decorator)

---

### 2.11 Controller: Enhance `GET /admin/users` with pagination
**Spec References:** admin-user-pagination R1, R2, R3, R9  
**Files:** `src/user/controller/user.controller.ts`  
**Estimated Lines:** ~30 lines  

**Acceptance Criteria:**
- [x] Accepts `@Query() pagination: PaginationQueryDTO`
- [x] Backward compat: if `page` is undefined, returns `UserDTO[]` (existing behavior)
- [x] If `page` present: calls `userService.findPaginated(pagination)`
- [x] Returns `PaginatedUserResponseDTO` with envelope
- [x] Error handling: validation errors → 400, others → 500

**Dependencies:** 1.3, 1.4, 2.7, 3.4 (decorator)

---

### 2.12 API Docs: Create decorators for new endpoints
**Spec References:** Proposal "API docs" section; Design "File Changes"  
**Files:** `src/user/api-docs/user.decorator.ts`  
**Estimated Lines:** ~105 lines  

**Acceptance Criteria:**
- [x] `UpdateUserDoc()`: PATCH endpoint docs with 200, 400 (002, 003), 403, 500 responses
- [x] `DeleteUserDoc()`: DELETE endpoint docs with 200, 400 (001), 403, 500 responses
- [x] `ToggleActiveDoc()`: PATCH /active endpoint docs with 200, 400 (001, 005), 403, 500 responses
- [x] `PaginatedGetDoc()`: Enhanced GET docs with paginated response schema
- [x] All decorators use `applyDecorators` pattern consistent with existing code
- [x] Include `@ApiExtraModels` for DTOs and examples

**Dependencies:** 1.2, 1.3, 1.4, 2.13 (examples)

---

### 2.13 API Docs: Add examples for new responses
**Spec References:** Proposal "API docs" section; Design "File Changes"  
**Files:** `src/user/api-docs/examples/user.examples.ts`  
**Estimated Lines:** ~45 lines  

**Acceptance Criteria:**
- [x] `UpdateUserRequest` example: sample PATCH body
- [x] `PaginatedUserResponse` example: full paginated envelope with sample data
- [x] Examples match DTO structures exactly
- [x] Swagger `@ApiProperty` decorators included

**Dependencies:** 1.2, 1.4

---

## Phase 3: Testing

### 3.1 Unit Tests: UpdateUserDTO validation
**Spec References:** admin-user-update R6, Scenarios 10-12  
**Files:** `src/user/dto/update-user.dto.spec.ts`  
**Estimated Lines:** ~40 lines  

**Acceptance Criteria:**
- [x] Test valid payload passes validation
- [x] Test invalid email format returns validation error
- [x] Test empty name returns validation error
- [x] Test invalid role enum returns validation error
- [x] Use `validate` from class-validator

**Dependencies:** 1.2

---

### 3.2 Unit Tests: PaginationQueryDTO validation
**Spec References:** admin-user-pagination R1, R6, R7, Scenarios 10-11  
**Files:** `src/user/dto/pagination-query.dto.spec.ts`  
**Estimated Lines:** ~40 lines  

**Acceptance Criteria:**
- [x] Test default values applied correctly
- [x] Test `page < 1` returns validation error
- [x] Test `limit > 100` returns validation error
- [x] Test invalid `sortBy` (not in whitelist) returns validation error
- [x] Test invalid `sortOrder` returns validation error
- [x] Test `isActive` string-to-boolean transformation

**Dependencies:** 1.3

---

### 3.3 Unit Tests: Service methods (updateUser, deleteUser, toggleActive)
**Spec References:** admin-user-update Scenarios 1-12; admin-user-delete Scenarios 1-4; admin-user-toggle-active Scenarios 1-4  
**Files:** `src/user/service/user.service.spec.ts`  
**Estimated Lines:** ~80 lines  

**Acceptance Criteria:**
- [x] `updateUser`: success with partial update
- [x] `updateUser`: uniqueness conflict (email) throws 003
- [x] `updateUser`: uniqueness conflict (userName) throws 002
- [x] `updateUser`: self-exclusion allows same email/userName
- [x] `updateUser`: not found throws `UserNotFoundError`
- [x] `deleteUser`: soft-delete active user
- [x] `deleteUser`: idempotent on already-deleted
- [x] `deleteUser`: not found throws `UserNotFoundError`
- [x] `toggleActive`: deactivate active user
- [x] `toggleActive`: activate inactive user
- [x] `toggleActive`: soft-deleted user throws `UserAlreadyDeletedError`
- [x] Mocked repository pattern (consistent with existing specs)

**Dependencies:** 2.4, 2.5, 2.6

---

### 3.4 Unit Tests: Service findPaginated method
**Spec References:** admin-user-pagination Scenarios 1-14  
**Files:** `src/user/service/user.service.spec.ts` (add to 3.3)  
**Estimated Lines:** ~30 lines  

**Acceptance Criteria:**
- [x] Test delegation to repository with correct filters
- [x] Test pagination envelope calculation (totalPages)
- [x] Test empty result handling

**Dependencies:** 2.7

---

### 3.5 Unit Tests: Controller endpoints
**Spec References:** All spec scenarios (response codes and shapes)  
**Files:** `src/user/controller/user.controller.spec.ts`  
**Estimated Lines:** ~60 lines  

**Acceptance Criteria:**
- [x] `PATCH /:id`: success returns `UserDTO`
- [x] `PATCH /:id`: uniqueness errors map to 400
- [x] `PATCH /:id`: not found maps to 400
- [x] `DELETE /:id`: success returns confirmation object
- [x] `DELETE /:id`: idempotent success
- [x] `DELETE /:id`: not found maps to 400
- [x] `PATCH /:id/active`: success returns updated `UserDTO`
- [x] `PATCH /:id/active`: deleted user maps to 400 (code 005)
- [x] `GET /`: backward compat returns `UserDTO[]`
- [x] `GET /?page=1`: returns paginated envelope
- [x] All endpoints: server errors map to 500
- [x] Mocked service pattern (consistent with existing specs)

**Dependencies:** 2.8, 2.9, 2.10, 2.11

---

### 3.6 Unit Tests: Repository methods
**Spec References:** admin-user-delete R2; admin-user-pagination R4, R5  
**Files:** `src/user/repository/user.repository.spec.ts`  
**Estimated Lines:** ~50 lines  

**Acceptance Criteria:**
- [x] `softDelete`: sets `isActive=false` and `deletedAt` timestamp
- [x] `existsByEmailExcludingSelf`: returns true for other user, false for self
- [x] `existsByNameExcludingSelf`: returns true for other user, false for self
- [x] `findPaginated`: returns correct subset with filters
- [x] `findPaginated`: text search is case-insensitive
- [x] `findPaginated`: sorting works correctly
- [x] Integration with mongodb-memory-server (consistent with existing pattern)

**Dependencies:** 2.1, 2.2, 2.3

---

### 3.7 Integration Tests: End-to-end endpoint behavior
**Spec References:** All spec scenarios (full E2E validation)  
**Files:** `test/user/admin-crud.e2e-spec.ts`  
**Estimated Lines:** ~100 lines  

**Acceptance Criteria:**
- [x] Full E2E test suite for all 4 endpoints
- [x] JWT authentication required (403 without token)
- [x] Admin role required (403 with non-admin role)
- [x] Database state validation after each operation
- [x] Test soft-delete actually sets `deletedAt` in DB
- [x] Test pagination returns correct counts
- [x] Test backward compat (no page param → array)
- [x] Use SuperTest with test DB setup

**Dependencies:** All implementation tasks (2.8-2.11)

---

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| **Total Estimated Changed Lines** | ~850 lines |
| **400-Line Budget** | EXCEEDED (212% of budget) |
| **Chained PR Recommended** | **YES** |
| **Decision Needed Before Apply** | **YES** |

### Recommended Chained PR Structure

Given the 850-line estimate exceeds the 400-line budget, split into 3 chained PRs:

**PR 1: Foundation + Update Endpoint (~300 lines)**
- Tasks: 1.1, 1.2, 1.5, 1.6, 2.1, 2.4, 2.8, 2.12 (partial), 3.1, 3.3 (partial), 3.5 (partial)
- Scope: Entity change, UpdateUserDTO, errors, repository exclusions, service update, PATCH endpoint

**PR 2: Delete + Toggle Endpoints (~250 lines)**
- Tasks: 1.5 (already done), 2.2, 2.5, 2.6, 2.9, 2.10, 2.12 (partial), 2.13 (partial), 3.3 (partial), 3.5 (partial), 3.6 (partial)
- Scope: softDelete, deleteUser, toggleActive, DELETE and PATCH/active endpoints

**PR 3: Pagination + Full Testing (~300 lines)**
- Tasks: 1.3, 1.4, 2.3, 2.7, 2.11, 2.12 (partial), 2.13 (partial), 3.2, 3.4, 3.6 (partial), 3.7
- Scope: Pagination DTOs, findPaginated, enhanced GET endpoint, integration tests

---

## Task Execution Order

```
Phase 1 (Foundation):
  1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6
       ↓
Phase 2 (Implementation):
  2.1 → 2.2 → 2.3 → 2.4 → 2.5 → 2.6 → 2.7 → 2.8 → 2.9 → 2.10 → 2.11 → 2.12 → 2.13
       ↓
Phase 3 (Testing):
  3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7
```

---

## Notes

- **Strict TDD**: All tests must FAIL before implementation (`npm test`)
- **Ask-on-Risk**: This change exceeds 400-line budget — confirm chained PR strategy before starting
- **Backward Compatibility**: `GET /admin/users` without `page` param must return `UserDTO[]` (existing behavior)
- **Idempotency**: DELETE endpoint must succeed on already-deleted users without modifying `deletedAt`
- **Self-Exclusion**: Update uniqueness checks must allow updating email/userName to the same value
