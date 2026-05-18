# Spec: admin-user-update

## Purpose
Enable administrators to partially update user profile fields (name, lastName, email, userName, role, permissions) via `PATCH /admin/users/:id`, with uniqueness validation for email and userName that excludes the user being updated.

## Requirements

### R1 — Endpoint Contract
The system SHALL expose `PATCH /admin/users/:id` that accepts a JSON body conforming to `UpdateUserDTO` (all fields optional, partial update).

### R2 — Allowed Fields
The endpoint SHALL accept updates to: `name`, `lastName`, `email`, `userName`, `role`, `permissions`. The `password` field SHALL NOT be accepted via this endpoint.

### R3 — Uniqueness Validation
When `email` is provided in the request body, the system SHALL verify that no other user (excluding the target user by ID) already has that email. If a conflict exists, the system SHALL return HTTP 400 with error code `003`.

When `userName` is provided in the request body, the system SHALL verify that no other user (excluding the target user by ID) already has that userName. If a conflict exists, the system SHALL return HTTP 400 with error code `002`.

### R4 — Response
On success, the endpoint SHALL return HTTP 200 with the updated `UserDTO` in the response body.

### R5 — Not Found
If the user ID does not exist, the system SHALL return HTTP 400 with error code `001`.

### R6 — Validation
The request body SHALL be validated by class-validator decorators. Invalid payloads SHALL return HTTP 400 with validation details.

### R7 — Guard
The endpoint SHALL be protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role.

---

## Scenarios

### Scenario 1: Update name and lastName
**Given** an active user exists with ID `usr-001`, name `"Juan"`, lastName `"Pérez"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "name": "Juan Carlos", "lastName": "Pérez López" }`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `name: "Juan Carlos"` and `lastName: "Pérez López"`
**And** all other fields (`email`, `userName`, `role`, `permissions`) SHALL remain unchanged

### Scenario 2: Update email with uniqueness check — success
**Given** an active user exists with ID `usr-001` and email `"juan@example.com"`
**And** no other user has email `"juancarlos@example.com"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "email": "juancarlos@example.com" }`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `email: "juancarlos@example.com"`

### Scenario 3: Update email with uniqueness check — conflict
**Given** user `usr-001` exists with email `"juan@example.com"`
**And** user `usr-002` exists with email `"other@example.com"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "email": "other@example.com" }`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain error code `003` (email already exists)
**And** user `usr-001`'s email SHALL remain `"juan@example.com"`

### Scenario 4: Update email to same value — no conflict
**Given** user `usr-001` exists with email `"juan@example.com"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "email": "juan@example.com" }`
**Then** the system SHALL return HTTP 200
**And** the email SHALL NOT be treated as a conflict (self-exclusion applies)

### Scenario 5: Update userName with uniqueness check — success
**Given** user `usr-001` exists with userName `"juanperez"`
**And** no other user has userName `"juancarlos"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "userName": "juancarlos" }`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `userName: "juancarlos"`

### Scenario 6: Update userName with uniqueness check — conflict
**Given** user `usr-001` exists with userName `"juanperez"`
**And** user `usr-002` exists with userName `"maria"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "userName": "maria" }`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain error code `002` (userName already exists)
**And** user `usr-001`'s userName SHALL remain `"juanperez"`

### Scenario 7: Update role
**Given** user `usr-001` exists with role `"user"`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "role": "admin" }`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `role: "admin"`

### Scenario 8: Update permissions
**Given** user `usr-001` exists with `permissions: []`
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "permissions": ["users:read", "users:write"] }`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `permissions: ["users:read", "users:write"]`

### Scenario 9: User not found
**Given** no user exists with ID `nonexistent-id`
**When** an admin sends `PATCH /admin/users/nonexistent-id` with body `{ "name": "Test" }`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain error code `001` (user not found)

### Scenario 10: Invalid DTO — empty name
**Given** user `usr-001` exists
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "name": "" }`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain validation error details for the `name` field

### Scenario 11: Invalid DTO — malformed email
**Given** user `usr-001` exists
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "email": "not-an-email" }`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain validation error details for the `email` field

### Scenario 12: Update role with invalid enum value
**Given** user `usr-001` exists
**When** an admin sends `PATCH /admin/users/usr-001` with body `{ "role": "superadmin" }`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain validation error details for the `role` field
