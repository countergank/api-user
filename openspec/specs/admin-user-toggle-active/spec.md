# Spec: admin-user-toggle-active

## Purpose
Enable administrators to toggle a user's `isActive` status via `PATCH /admin/users/:id/active`. This endpoint SHALL reject attempts to toggle users that have been soft-deleted (`deletedAt` is set).

## Requirements

### R1 — Endpoint Contract
The system SHALL expose `PATCH /admin/users/:id/active` that toggles the `isActive` boolean of the identified user.

### R2 — Toggle Behavior
If the user's `isActive` is `true`, the system SHALL set it to `false`. If `false`, the system SHALL set it to `true`.

### R3 — Soft-Deleted Guard
If the target user has `deletedAt` set (soft-deleted), the system SHALL reject the request with HTTP 400 and error code `005` (user already deleted).

### R4 — Response
On success, the system SHALL return HTTP 200 with the updated `UserDTO` in the response body, reflecting the new `isActive` state.

### R5 — Not Found
If the user ID does not exist, the system SHALL return HTTP 400 with error code `001`.

### R6 — Guard
The endpoint SHALL be protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role.

---

## Scenarios

### Scenario 1: Deactivate active user
**Given** an active user exists with ID `usr-001`, `isActive: true`, and `deletedAt` is not set
**When** an admin sends `PATCH /admin/users/usr-001/active`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `isActive: false`
**And** the user's `deletedAt` SHALL remain unset

### Scenario 2: Activate inactive user
**Given** a user exists with ID `usr-001`, `isActive: false`, and `deletedAt` is not set
**When** an admin sends `PATCH /admin/users/usr-001/active`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `UserDTO` with `isActive: true`

### Scenario 3: Toggle soft-deleted user — rejected
**Given** a user exists with ID `usr-001`, `isActive: false`, and `deletedAt: "2024-06-15T10:00:00.000Z"`
**When** an admin sends `PATCH /admin/users/usr-001/active`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain error code `005` (user already deleted)
**And** the user's `isActive` SHALL remain unchanged

### Scenario 4: User not found
**Given** no user exists with ID `nonexistent-id`
**When** an admin sends `PATCH /admin/users/nonexistent-id/active`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain error code `001` (user not found)
