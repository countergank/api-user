# Design: Admin User CRUD — Complete Admin Operations

## Technical Approach

Layer 4 endpoints (update, delete, toggle-active, paginated GET) onto the existing controller→service→repository stack. No new modules, no new dependencies. The existing `UserService.update()` is reused for the update endpoint; new `findPaginated(filters)`, `softDelete(id)`, and `toggleActive(id)` methods are added. Soft delete uses a discriminator field (`deletedAt`) to separate permanently from temporarily deactivated users, avoiding `isActive` overloading.

## Architecture Decisions

| Decision | Options | Chosen | Why |
|----------|---------|--------|-----|
| Pagination querying | `mongoose-paginate-v2` package vs manual `skip()/limit()` | Manual `.skip()/.limit()/.countDocuments()` | No new deps (proposal constraint). Two queries (data + total) acceptable for expected scale |
| Backward compat trigger | `Accept` header vs query param presence | `page` query param presence | Explicit opt-in, avoids breaking existing consumers accidentally |
| Repo soft-delete filter | Filter in Mongoose query vs post-query filtering | `findAll`/`findPaginated` add `{ deletedAt: { $exists: false } }`; `findById` does NOT | `findById` needed by delete (idempotency check) and toggle-active (code 005 guard) |
| sortBy validation | Free-form vs whitelist | Whitelist: `name,lastName,email,userName,role,isActive,createdAt,updatedAt` | Prevents injection via unsanitized field names; returns 400 per R6 |
| Update validation | DTO-level decorators vs service-layer | class-validator decorators + service-level uniqueness (self-exclusion) | DTO catches shape errors early; service handles business logic (uniqueness excluding self) |

## Data Flow

```
GET /admin/users?page=1&limit=10&search=juan&role=admin
  → Controller: parse PaginationQueryDTO, detect `page` present
    → Service.findPaginated({ page, limit, sortBy, sortOrder, role, isActive, search })
      → Repository: build Mongo filter {$and: [...]} + .skip()/.limit()/.countDocuments()
        → Return { users, total }

PATCH /admin/users/:id { email: "new@x.com" }
  → Controller: validate UpdateUserDTO
    → Service.updateUser(id, dto)
      → Repository.findById(id) → if null: throw UserNotFoundError
      → if email: Repository.existsByEmailExcludingSelf(email, id) → if conflict: throw code 003
      → Repository.update(id, dto)

DELETE /admin/users/:id
  → Controller
    → Service.deleteUser(id)
      → Repository.findById(id) → if null: throw UserNotFoundError
      → if user.deletedAt: return idempotent success
      → Repository.softDelete(id) → set deletedAt=now, isActive=false

PATCH /admin/users/:id/active
  → Controller
    → Service.toggleActive(id)
      → Repository.findById(id) → if null: throw UserNotFoundError
      → if user.deletedAt: throw UserAlreadyDeletedError (code 005)
      → Repository.update(id, { isActive: !user.isActive })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/user/entities/user.entity.ts` | Modify | Add `@Prop() deletedAt?: Date` field |
| `src/user/dto/update-user.dto.ts` | Create | Partial update DTO: all fields optional except password excluded |
| `src/user/dto/pagination-query.dto.ts` | Create | Query params DTO: page, limit, sortBy, sortOrder, role, isActive, search |
| `src/user/dto/paginated-user-response.dto.ts` | Create | Response envelope: `{ data, total, page, limit, totalPages }` |
| `src/user/repository/user.repository.ts` | Modify | Add `findPaginated()`, `softDelete()`, `existsByEmailExcludingSelf()`, `existsByNameExcludingSelf()` |
| `src/user/service/user.service.ts` | Modify | Add `updateUser()`, `deleteUser()`, `toggleActive()`, `findPaginated()` |
| `src/user/controller/user.controller.ts` | Modify | 4 new endpoints + enhanced `findAll()` with pagination conditional |
| `src/user/api-docs/user.decorator.ts` | Modify | 4 new decorator functions |
| `src/user/api-docs/examples/user.examples.ts` | Modify | Add `UpdateUserRequest`, `PaginatedUserResponse` examples |
| `src/user/mocks/update-user-dto.mock.ts` | Create | Test mock for UpdateUserDTO |
| `src/user/mocks/paginated-user-response.mock.ts` | Create | Test mock for PaginatedUserResponseDTO |
| `src/user/errors/error.dictionary.ts` | Modify | Add codes `005` (user deleted), `006` (reserved) |
| `src/user/errors/error-instances.error.ts` | Modify | Add `UserAlreadyDeletedError` class |

## Interfaces / Contracts

```typescript
// UpdateUserDTO — excludes password, all optional
class UpdateUserDTO {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() userName?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsArray() @IsString({ each: true }) permissions?: string[];
}

// PaginationQueryDTO — validated query params
class PaginationQueryDTO {
  @IsOptional() @Min(1) page?: number = 1;
  @IsOptional() @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsIn(SORTABLE_FIELDS) sortBy?: string = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortOrder?: string = 'desc';
  @IsOptional() @IsString() role?: string;
  @IsOptional() @Transform(({ v }) => v === 'true') isActive?: boolean;
  @IsOptional() @IsString() search?: string;
}

// PaginatedUserResponseDTO
class PaginatedUserResponseDTO {
  data: UserDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

Sortable fields whitelist: `['name', 'lastName', 'email', 'userName', 'role', 'isActive', 'createdAt', 'updatedAt']`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — DTO | Validation rules for UpdateUserDTO, PaginationQueryDTO | Jest unit: invalid email format, missing fields, sortBy not in whitelist |
| Unit — Service | Uniqueness self-exclusion, idempotent delete, toggle rejects deleted, pagination filter assembly | Mocked repository; verify filter objects and skip/limit/sort calls |
| Unit — Controller | Backward compat return type, paginated envelope shape, error code mapping | Mocked service; assert response shapes |
| Integration | End-to-end endpoint behavior matching all spec scenarios | Use existing `test/user/` setup with test DB; validate response codes, payloads, DB state |
| E2E | Guard enforcement, swagger generation | SuperTest with JWT auth; verify 403 without admin role |

Strict TDD: all tests written to FAIL against current implementation before writing production code (`npm test`).

## Migration / Rollout

No data migration required. The `deletedAt` field is optional — existing documents simply lack it. Rollback: revert branch. If `deletedAt` proliferated, run `db.users.updateMany({}, { $unset: { deletedAt: "" } })`.

## Open Questions

None.
