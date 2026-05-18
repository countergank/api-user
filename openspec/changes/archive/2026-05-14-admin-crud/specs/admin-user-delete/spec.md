# Spec: admin-user-delete

## Purpose
Enable administrators to soft-delete users via `DELETE /admin/users/:id`, setting `isActive=false` and recording a `deletedAt` timestamp. The operation SHALL be idempotent — calling it on an already-deleted user SHALL succeed without error.

## Requirements

### R1 — Endpoint Contract
The system SHALL expose `DELETE /admin/users/:id` that performs a soft delete on the identified user.

### R2 — Soft Delete Behavior
On successful deletion, the system SHALL set `isActive=false` and `deletedAt=new Date()` on the user document.

### R3 — Idempotency
If the target user already has `deletedAt` set (previously soft-deleted), the system SHALL return HTTP 200 with the same success response without modifying the existing `deletedAt` value.

### R4 — Response
On success, the system SHALL return HTTP 200 with a JSON body containing `{ "message": string, "userId": string }`.

### R5 — Not Found
If the user ID does not exist, the system SHALL return HTTP 400 with error code `001`.

### R6 — Guard
The endpoint SHALL be protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role.

---

## Scenarios

### Scenario 1: Soft delete active user
**Given** an active user exists with ID `usr-001`, `isActive: true`, and `deletedAt` is not set
**When** an admin sends `DELETE /admin/users/usr-001`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `{ "message": "User soft-deleted", "userId": "usr-001" }`
**And** the user's `isActive` SHALL be `false`
**And** the user's `deletedAt` SHALL be set to the current timestamp

### Scenario 2: Soft delete already inactive (non-deleted) user
**Given** a user exists with ID `usr-001`, `isActive: false`, and `deletedAt` is not set
**When** an admin sends `DELETE /admin/users/usr-001`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `{ "message": "User soft-deleted", "userId": "usr-001" }`
**And** the user's `deletedAt` SHALL be set to the current timestamp

### Scenario 3: Soft delete already soft-deleted user (idempotent)
**Given** a user exists with ID `usr-001`, `isActive: false`, and `deletedAt: "2024-06-15T10:00:00.000Z"`
**When** an admin sends `DELETE /admin/users/usr-001`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain `{ "message": "User soft-deleted", "userId": "usr-001" }`
**And** the user's `deletedAt` SHALL remain `"2024-06-15T10:00:00.000Z"` (unchanged)

### Scenario 4: User not found
**Given** no user exists with ID `nonexistent-id`
**When** an admin sends `DELETE /admin/users/nonexistent-id`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain error code `001` (user not found)
