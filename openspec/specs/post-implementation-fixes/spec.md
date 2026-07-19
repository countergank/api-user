# post-implementation-fixes Specification

> Migrated from `openspec/SPEC.md` (deleted 2026-07-06).

## Overview

Bug fixes applied after SDD implementation for admin-crud and rate-limiting features.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| FIX-01 | lockedUntil cleared on unlock | unlockUser() and successful login MUST set lockedUntil to null (not undefined) |
| FIX-02 | isActive filter works correctly | Query param isActive=false MUST return inactive users, not be converted to true |
| FIX-03 | isActive filter independent of deletedAt | Explicit isActive filter MUST NOT be blocked by deletedAt exclusion |
| FIX-04 | CastError → 400 on all :id endpoints | Invalid MongoDB ObjectId MUST return 400 with INVALID_USER_ID, not 500 |
| FIX-05 | UpdateUserDTO no default role | CreateUserDTO role default MUST NOT leak into UpdateUserDTO via PartialType |

## Implementation

- `src/auth/auth.service.ts` — null for lockedUntil clear
- `src/user/service/user.service.ts` — null for lockedUntil clear
- `src/user/dto/pagination-query.dto.ts` — @Type(() => String) + manual @Transform for isActive
- `src/user/repository/user.repository.ts` — conditional deletedAt filter
- `src/user/controller/user.controller.ts` — CastError catch in all :id endpoints
- `src/user/dto/create-user.dto.ts` — removed role TypeScript default
