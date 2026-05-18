# Spec: admin-user-pagination

## Purpose
Enhance `GET /admin/users` to support pagination, filtering, text search, and sorting via query parameters. When no pagination params are present, the endpoint SHALL retain backward compatibility by returning `UserDTO[]`.

## Requirements

### R1 — Endpoint Contract
The system SHALL accept `GET /admin/users` with optional query parameters:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed, minimum 1) |
| `limit` | number | 20 | Items per page (minimum 1, maximum 100) |
| `sortBy` | string | `createdAt` | Field to sort by |
| `sortOrder` | string | `desc` | Sort direction: `asc` or `desc` |
| `role` | string | — | Filter by exact role value |
| `isActive` | boolean | — | Filter by active status |
| `search` | string | — | Text search across `name`, `lastName`, `email`, `userName` |

### R2 — Backward Compatibility
When the `page` query parameter is absent, the system SHALL return `UserDTO[]` (plain array), matching the existing behavior.

### R3 — Paginated Response Shape
When `page` is present, the system SHALL return HTTP 200 with JSON body:
```json
{
  "data": UserDTO[],
  "total": number,
  "page": number,
  "limit": number,
  "totalPages": number
}
```

### R4 — Text Search
The `search` parameter SHALL perform a case-insensitive regex match across `name`, `lastName`, `email`, and `userName` fields using MongoDB `$or`.

### R5 — Filter Combination
The system SHALL support combining `role`, `isActive`, and `search` filters. All applied filters SHALL use AND logic.

### R6 — Sorting
The system SHALL sort results by the field specified in `sortBy` in the direction specified by `sortOrder`. If `sortBy` references a non-existent field, the system SHALL return HTTP 400.

### R7 — Invalid Page
If `page` is less than 1, the system SHALL return HTTP 400 with a validation error.

### R8 — Empty Results
When no users match the applied filters, the system SHALL return HTTP 200 with `data: []`, `total: 0`, and `totalPages: 0`.

### R9 — Guard
The endpoint SHALL be protected by `JwtAuthGuard` and `RolesGuard`, requiring `admin` role.

---

## Scenarios

### Scenario 1: Default pagination (no params — backward compat)
**Given** 5 users exist in the database
**When** an admin sends `GET /admin/users` with no query parameters
**Then** the system SHALL return HTTP 200
**And** the response body SHALL be a plain array `UserDTO[]` with 5 elements

### Scenario 2: Default pagination (with page param)
**Given** 25 users exist in the database
**When** an admin sends `GET /admin/users?page=1`
**Then** the system SHALL return HTTP 200
**And** the response body SHALL contain:
  - `data`: array of 20 `UserDTO` objects (default limit)
  - `total`: 25
  - `page`: 1
  - `limit`: 20
  - `totalPages`: 2

### Scenario 3: Custom page and limit
**Given** 50 users exist in the database
**When** an admin sends `GET /admin/users?page=2&limit=10`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain 10 `UserDTO` objects (items 11-20)
**And** `total` SHALL be 50
**And** `page` SHALL be 2
**And** `limit` SHALL be 10
**And** `totalPages` SHALL be 5

### Scenario 4: Filter by role
**Given** 10 users exist: 3 with `role: "admin"`, 5 with `role: "user"`, 2 with `role: "viewer"`
**When** an admin sends `GET /admin/users?page=1&role=admin`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain exactly 3 users, all with `role: "admin"`
**And** `total` SHALL be 3

### Scenario 5: Filter by isActive
**Given** 10 users exist: 7 with `isActive: true`, 3 with `isActive: false`
**When** an admin sends `GET /admin/users?page=1&isActive=true`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain exactly 7 users, all with `isActive: true`
**And** `total` SHALL be 7

### Scenario 6: Search by name
**Given** users exist with names `"Juan Pérez"`, `"María García"`, `"Juan Carlos López"`
**When** an admin sends `GET /admin/users?page=1&search=juan`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain `"Juan Pérez"` and `"Juan Carlos López"`
**And** `total` SHALL be 2
**And** the search SHALL be case-insensitive

### Scenario 7: Search by email
**Given** a user exists with email `"testuser@example.com"`
**When** an admin sends `GET /admin/users?page=1&search=testuser`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain the user with email `"testuser@example.com"`

### Scenario 8: Combine filters — role + isActive + search
**Given** users exist:
  - `usr-001`: `role: "admin"`, `isActive: true`, `name: "Juan"`
  - `usr-002`: `role: "admin"`, `isActive: false`, `name: "María"`
  - `usr-003`: `role: "user"`, `isActive: true`, `name: "Juan"`
**When** an admin sends `GET /admin/users?page=1&role=admin&isActive=true&search=juan`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain only `usr-001`
**And** `total` SHALL be 1

### Scenario 9: Empty result
**Given** no users exist with `role: "superadmin"`
**When** an admin sends `GET /admin/users?page=1&role=superadmin`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL be `[]`
**And** `total` SHALL be 0
**And** `totalPages` SHALL be 0

### Scenario 10: Invalid page number (page=0)
**Given** users exist in the database
**When** an admin sends `GET /admin/users?page=0`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain validation error details indicating `page` must be >= 1

### Scenario 11: Invalid page number (page=-1)
**Given** users exist in the database
**When** an admin sends `GET /admin/users?page=-1&limit=10`
**Then** the system SHALL return HTTP 400
**And** the response SHALL contain validation error details

### Scenario 12: Sort by field ascending
**Given** users exist with names `"Carlos"`, `"Ana"`, `"Bruno"`
**When** an admin sends `GET /admin/users?page=1&sortBy=name&sortOrder=asc`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL be ordered: `"Ana"`, `"Bruno"`, `"Carlos"`

### Scenario 13: Sort by field descending (default)
**Given** users exist with `createdAt` timestamps: `2024-01-01`, `2024-06-01`, `2024-03-01`
**When** an admin sends `GET /admin/users?page=1`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL be sorted by `createdAt` descending: `2024-06-01`, `2024-03-01`, `2024-01-01`

### Scenario 14: Last page has fewer items
**Given** 25 users exist in the database
**When** an admin sends `GET /admin/users?page=3&limit=10`
**Then** the system SHALL return HTTP 200
**And** `data` SHALL contain 5 `UserDTO` objects
**And** `total` SHALL be 25
**And** `page` SHALL be 3
**And** `totalPages` SHALL be 3
