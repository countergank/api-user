# admin-users Specification

## Purpose

Admin user management: create new users and retrieve user by ID. Complements existing admin-user-* specs (toggle-active, update, delete). Unlock is already specced in `account-lockout` (AL-06).

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| AU-01 | Create user | POST /admin/users creates a new user with role assignment |
| AU-02 | Get user by ID | GET /admin/users/:id returns a single user |
| AU-03 | Admin auth required | All endpoints require JwtAuthGuard + ADMIN role |

### Requirement: AU-01 — Create user

The system MUST accept POST /admin/users with user creation DTO (email, password, role, etc.).

#### Scenario: Create user successfully

- GIVEN authenticated admin user
- WHEN POST /admin/users with { email: "new@test.com", password: "Secure123!", role: "USER" }
- THEN returns HTTP 201 with created user object
- AND user is persisted in the database
- AND password is hashed (never stored in plaintext)

#### Scenario: Duplicate email rejected

- GIVEN a user with email "existing@test.com" already exists
- WHEN POST /admin/users with { email: "existing@test.com", ... }
- THEN returns HTTP 409 or 400 with duplicate-email error

#### Scenario: Invalid password rejected

- WHEN POST /admin/users with weak password (e.g., "123")
- THEN returns HTTP 400 with validation error

#### Scenario: Non-admin cannot create

- GIVEN authenticated user with USER role
- WHEN POST /admin/users with valid body
- THEN returns HTTP 403 Forbidden

### Requirement: AU-02 — Get user by ID

The system MUST return a single user by MongoDB ObjectId.

#### Scenario: Get existing user

- GIVEN a user with ID "507f191e810c19729de860ea" exists
- WHEN authenticated admin sends GET /admin/users/507f191e810c19729de860ea
- THEN returns HTTP 200 with user object
- AND response includes lockout fields (failedLoginAttempts, lockedUntil) per AL-09

#### Scenario: User not found

- GIVEN no user with ID "000000000000000000000000" exists
- WHEN authenticated admin sends GET /admin/users/000000000000000000000000
- THEN returns HTTP 404 Not Found

#### Scenario: Invalid ObjectId format

- WHEN authenticated admin sends GET /admin/users/not-a-valid-id
- THEN returns HTTP 400 Bad Request

### Requirement: AU-03 — Admin auth required

All admin-users endpoints MUST require valid JWT and ADMIN role.

#### Scenario: 401 without token

- WHEN any /admin/users request is made without Authorization
- THEN returns HTTP 401 Unauthorized

#### Scenario: 403 with non-admin role

- GIVEN authenticated user with USER role
- WHEN any /admin/users request is made
- THEN returns HTTP 403 Forbidden
