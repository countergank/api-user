# API User - Specification

This document contains the authoritative specifications for all domains in the api-user project.

---

## Domain: password-validation

### Overview
Password strength validation with 8 security rules enforced on user registration and password change endpoints.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| REQ-FORT-001 | Min 8 characters | Password MUST be at least 8 characters long |
| REQ-FORT-002 | Lowercase letter | Password MUST contain at least 1 lowercase letter |
| REQ-FORT-003 | Uppercase letter | Password MUST contain at least 1 uppercase letter |
| REQ-FORT-004 | Number | Password MUST contain at least 1 number |
| REQ-FORT-005 | Special character | Password MUST contain at least 1 special character (@$!%*?&) |
| REQ-FORT-006 | Max 64 characters | Password MUST NOT exceed 64 characters |
| REQ-FORT-007 | No consecutive repeats | Password MUST NOT contain 3 or more consecutive repeated characters |
| REQ-FORT-008 | No common sequences | Password MUST NOT contain common sequences (123, abc, qwe, asd, zxc) |

### Scenarios

#### Scenario: Register user with valid password
- **Given**: User provides valid password meeting all 8 rules
- **When**: POST /auth/register is called
- **Then**: User is created successfully

#### Scenario: Register user with weak password
- **Given**: User provides password that violates one or more rules
- **When**: POST /auth/register is called
- **Then**: Validation error returned with specific violation details

#### Scenario: Change password with valid password
- **Given**: Authenticated user provides valid new password
- **When**: POST /users/change-password is called
- **Then**: Password is updated successfully

#### Scenario: Change password with weak password
- **Given**: Authenticated user provides invalid new password
- **When**: POST /users/change-password is called
- **Then**: Validation error returned with specific violation details

### Error Codes

| Code | Description |
|------|-------------|
| FORT-001 | Password must be at least 8 characters |
| FORT-002 | Password must contain at least 1 lowercase letter |
| FORT-003 | Password must contain at least 1 uppercase letter |
| FORT-004 | Password must contain at least 1 number |
| FORT-005 | Password must contain at least 1 special character (@$!%*?&) |
| FORT-006 | Password must not exceed 64 characters |
| FORT-007 | Password must not contain 3 or more consecutive repeated characters |
| FORT-008 | Password must not contain common sequences |

### Affected Endpoints

| Endpoint | DTO | Validation |
|----------|-----|------------|
| POST /auth/register | RegisterUserDTO | ✅ @PasswordStrength() |
| POST /users/change-password | ChangePasswordDTO | ✅ @PasswordStrength() |
| POST /admin/users | CreateUserDTO | ✅ @PasswordStrength() |

### Implementation

- **Validator**: `src/common/validators/password-strength.validator.ts`
- **Interface**: `src/common/interfaces/password-validation.interface.ts`
- **Decorator**: `src/common/decorators/password-strength.decorator.ts`

---

## Domain: rbac

### Overview
Role-Based Access Control with three roles: USER, ADMIN, VIEWER.

*(To be documented)*

---

## Domain: auth-login

### Overview
Authentication with JWT tokens.

*(To be documented)*

---

## Domain: user-profile

### Overview
User profile management and password change.

*(To be documented)*

---

## Domain: api-documentation

### Overview
OpenAPI/Swagger documentation.

*(To be documented)*

---

## Domain: error-handling

### Overview
Global error handling patterns.

*(To be documented)*

---

## Domain: config-validation

### Overview
Configuration validation at startup.

*(To be documented)*

---

## Domain: guards

### Overview
Authorization guards for role-based access.

*(To be documented)*

---

## Domain: nestjs-architecture

### Overview
NestJS architecture patterns and conventions.

*(To be documented)*

---

## Domain: rate-limiting

### Overview

Request throttling for public auth endpoints using `@nestjs/throttler` with in-memory storage. Protects login, register, forgot-password, and other auth endpoints against abuse. Limits are configurable via environment variables, with stricter thresholds on login and forgot-password than on register and verification endpoints.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| RL-01 | Login endpoint rate-limited | POST /auth/login MUST return 429 Too Many Requests when the per-IP limit is exceeded |
| RL-02 | Register endpoint rate-limited | POST /auth/register MUST return 429 when the per-IP limit is exceeded |
| RL-03 | Forgot-password endpoint rate-limited | POST /auth/forgot-password MUST return 429 when the per-IP limit is exceeded |
| RL-04 | Configurable via environment variables | All throttle limits and TTLs MUST be configurable via env vars |
| RL-05 | Retry-After header on 429 | Every 429 response MUST include a `Retry-After` header |
| RL-06 | Stricter limits on login | Login and forgot-password MUST have lower limits than register/verify |
| RL-07 | Valid requests within limit pass | Requests within limit MUST be processed normally |
| RL-08 | Throttler applied to all auth endpoints | All 8 public auth endpoints MUST have `@Throttle()` decorators |
| RL-09 | ThrottlerModule registered in AppModule | `ThrottlerModule.forRoot()` MUST be registered |
| RL-10 | i18n error message for rate limit | 429 responses MUST include i18n-translated `errors.RATE_LIMITED` |

### Error Codes

| Status | Code | i18n Key | Description |
|--------|------|----------|-------------|
| 429 | RATE_LIMITED | `errors.RATE_LIMITED` | Too many requests |

### Affected Endpoints

| Method | Path | Throttle Default |
|--------|------|-----------------|
| POST | /auth/login | 5 req / 60s |
| POST | /auth/forgot-password | 3 req / 60s |
| POST | /auth/register | 10 req / 60s |
| POST | /auth/reset-password | 10 req / 60s |
| POST | /auth/verify-email | 10 req / 60s |
| POST | /auth/confirm-email-change | 10 req / 60s |
| POST | /auth/resend-verification | 10 req / 60s |
| POST | /auth/refresh | 10 req / 60s |

### Full Spec

See `openspec/specs/rate-limiting/spec.md` for complete scenarios and i18n translation keys.

---

## Domain: account-lockout

### Overview

Consecutive failed-login tracking and account lockout mechanism. After N consecutive failed login attempts, the account is locked for a configurable duration. Locked accounts return HTTP 423. Auto-unlock after duration expires. Admin manual unlock via dedicated endpoint.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| AL-01 | Lock after N consecutive failures | After `LOCKOUT_MAX_ATTEMPTS` (default 5) consecutive failures, account MUST lock |
| AL-02 | Counter resets on success | Successful login MUST reset `failedLoginAttempts` and clear `lockedUntil` |
| AL-03 | Locked returns distinct error | Locked account MUST return HTTP 423 with `ACCOUNT_LOCKED`, not 401 |
| AL-04 | Auto-unlock after duration | After `LOCKOUT_DURATION_MINUTES` (default 15), account auto-unlocks |
| AL-05 | Configurable duration | `LOCKOUT_MAX_ATTEMPTS` and `LOCKOUT_DURATION_MINUTES` via env vars |
| AL-06 | Admin manual unlock | Admin endpoint resets counter and clears lockout |
| AL-07 | Non-existent user no lock | Failed attempts for unknown emails MUST NOT create/increment counters |
| AL-08 | Lockout visible in admin views | `failedLoginAttempts` and `lockedUntil` visible in admin user views |
| AL-09 | Lockout fields on User entity | User entity includes `failedLoginAttempts` and `lockedUntil` |
| AL-10 | i18n for lockout | 423 responses include `errors.ACCOUNT_LOCKED` in es/en/pt |
| AL-11 | AccountLockedException class | `AccountLockedException` (extends `HttpException`, HTTP 423) |

### Error Codes

| Status | Code | i18n Key | Description |
|--------|------|----------|-------------|
| 423 | ACCOUNT_LOCKED | `errors.ACCOUNT_LOCKED` | Account temporarily locked |

### Affected Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | /auth/login | No | — | Lockout check before credential validation |
| POST | /auth/admin/unlock/:userId | Yes | Admin | Manually unlock a locked account |

### Full Spec

See `openspec/specs/account-lockout/spec.md` for complete scenarios and i18n translation keys.

---

## Domain: admin-user-update

### Overview

Enable administrators to partially update user profile fields (name, lastName, email, userName, role, permissions) via `PATCH /admin/users/:id`, with uniqueness validation for email and userName that excludes the user being updated.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| R1 | Endpoint Contract | `PATCH /admin/users/:id` accepts JSON body conforming to `UpdateUserDTO` (all fields optional) |
| R2 | Allowed Fields | Accepts: `name`, `lastName`, `email`, `userName`, `role`, `permissions`. Password SHALL NOT be accepted |
| R3 | Uniqueness Validation | Email conflicts → HTTP 400 code `003`; userName conflicts → HTTP 400 code `002`. Excludes self by ID |
| R4 | Response | Success returns HTTP 200 with updated `UserDTO` |
| R5 | Not Found | Non-existent ID returns HTTP 400 with code `001` |
| R6 | Validation | Request body validated by class-validator; invalid payloads → HTTP 400 |
| R7 | Guard | Protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role |

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | 001 | User not found |
| 400 | 002 | UserName already exists |
| 400 | 003 | Email already exists |

### Affected Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| PATCH | /admin/users/:id | Yes | Admin | Partial update user profile |

### Full Spec

See `openspec/specs/admin-user-update/spec.md` for complete scenarios (12 scenarios).

---

## Domain: admin-user-delete

### Overview

Enable administrators to soft-delete users via `DELETE /admin/users/:id`, setting `isActive=false` and recording a `deletedAt` timestamp. The operation SHALL be idempotent.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| R1 | Endpoint Contract | `DELETE /admin/users/:id` performs soft delete |
| R2 | Soft Delete Behavior | Sets `isActive=false` and `deletedAt=new Date()` on the user document |
| R3 | Idempotency | Already-deleted users return HTTP 200 without modifying `deletedAt` |
| R4 | Response | Success returns HTTP 200 with `{ message: string, userId: string }` |
| R5 | Not Found | Non-existent ID returns HTTP 400 with code `001` |
| R6 | Guard | Protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role |

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | 001 | User not found |

### Affected Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| DELETE | /admin/users/:id | Yes | Admin | Soft-delete user |

### Full Spec

See `openspec/specs/admin-user-delete/spec.md` for complete scenarios (4 scenarios).

---

## Domain: admin-user-toggle-active

### Overview

Enable administrators to toggle a user's `isActive` status via `PATCH /admin/users/:id/active`. Rejects attempts to toggle soft-deleted users.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| R1 | Endpoint Contract | `PATCH /admin/users/:id/active` toggles the `isActive` boolean |
| R2 | Toggle Behavior | If `isActive=true` → `false`; if `false` → `true` |
| R3 | Soft-Deleted Guard | Soft-deleted users (`deletedAt` set) return HTTP 400 with code `005` |
| R4 | Response | Success returns HTTP 200 with updated `UserDTO` |
| R5 | Not Found | Non-existent ID returns HTTP 400 with code `001` |
| R6 | Guard | Protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role |

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | 001 | User not found |
| 400 | 005 | User already deleted (cannot toggle) |

### Affected Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| PATCH | /admin/users/:id/active | Yes | Admin | Toggle user active status |

### Full Spec

See `openspec/specs/admin-user-toggle-active/spec.md` for complete scenarios (4 scenarios).

---

## Domain: admin-user-pagination

### Overview

Enhance `GET /admin/users` to support pagination, filtering, text search, and sorting via query parameters. When no pagination params are present, the endpoint retains backward compatibility.

### Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| R1 | Endpoint Contract | `GET /admin/users` accepts optional query params: page, limit, sortBy, sortOrder, role, isActive, search |
| R2 | Backward Compatibility | When `page` is absent, returns `UserDTO[]` (plain array, existing behavior) |
| R3 | Paginated Response | Returns `{ data, total, page, limit, totalPages }` when `page` present |
| R4 | Text Search | `search` performs case-insensitive regex across name, lastName, email, userName via MongoDB `$or` |
| R5 | Filter Combination | `role`, `isActive`, and `search` filters combine with AND logic |
| R6 | Sorting | `sortBy`/`sortOrder` control sort; invalid `sortBy` returns HTTP 400 |
| R7 | Invalid Page | `page < 1` returns HTTP 400 with validation error |
| R8 | Empty Results | No matches returns HTTP 200 with `data: []`, `total: 0`, `totalPages: 0` |
| R9 | Guard | Protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role |

### Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | — | Validation errors (invalid page, sortBy, limit, etc.) |

### Affected Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /admin/users | Yes | Admin | Paginated/filtered user listing |

### Full Spec

See `openspec/specs/admin-user-pagination/spec.md` for complete scenarios (14 scenarios).

---

## Metadata

| Property | Value |
|----------|-------|
| Last Updated | 2026-05-14 |
| Total Domains | 15 |
| Fully Documented | 7 (password-validation, rate-limiting, account-lockout, admin-user-update, admin-user-delete, admin-user-toggle-active, admin-user-pagination) |