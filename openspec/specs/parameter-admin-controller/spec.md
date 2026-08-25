# Spec: parameter-admin-controller

## Purpose

Define admin parameter endpoints: GET /admin/parameters, GET /admin/parameters/:group, and PUT /admin/parameters/:key with contracts, request/response shapes, status codes, and security rules.

## Requirements

### R1 — Endpoint Contracts

The system SHALL expose three admin parameter endpoints:

#### R1.1 GET /admin/parameters
- **Contract**: Returns all parameters with current runtime values
- **Response**: `ParameterResponseDto[]` (200 OK)
- **Guards**: `JwtAuthGuard`, `RolesGuard(@Roles(UserRole.ADMIN))`
- **Rate limit**: THROTTLE_ADMIN_DEFAULT (30/min)
- **Audit**: No audit log entry

#### R1.2 GET /admin/parameters/:group
- **Contract**: Returns parameters filtered by group name
- **Response**: `ParameterResponseDto[]` (200 OK)
- **Guards**: `JwtAuthGuard`, `RolesGuard(@Roles(UserRole.ADMIN))`
- **Rate limit**: THROTTLE_ADMIN_DEFAULT (30/min)
- **Audit**: No audit log entry

#### R1.3 PUT /admin/parameters/:key
- **Contract**: Updates parameter's runtime value by key
- **Request**: `UpdateParameterDto`
- **Response**: `ParameterResponseDto` (200 OK)
- **Guards**: `JwtAuthGuard`, `RolesGuard(@Roles(UserRole.ADMIN))`
- **Rate limit**: THROTTLE_ADMIN_STRICT (10/min)
- **Audit**: `@AuditAction({ action: 'PARAMETER_UPDATE', resource: 'parameter' })`

### R2 — Response Shapes

#### R2.1 ParameterResponseDto
```typescript
{
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  group: string;
  ttl: number;
  default: string | number | boolean;
  isOverridden: boolean;
}
```

#### R2.2 UpdateParameterDto
```typescript
{
  key: string;
  value: string | number | boolean;
}
```

### R3 — Status Code Contracts

#### R3.1 Success Codes
- **GET /admin/parameters**: 200 OK (when found)
- **GET /admin/parameters/:group**: 200 OK (when found)
- **PUT /admin/parameters/:key**: 200 OK (update successful)

#### R3.2 Client Error Codes
- **GET /admin/parameters**: 404 Not Found (query param key missing) - actually this is more like 400, but per proposal
- **PUT /admin/parameters/:key**: 
  - 404 Not Found (key not in registry)
  - 409 Conflict (key overridden by environment)
  - 422 Unprocessable Entity (DTO validation failure)
  - 400 Bad Request (invalid input)

#### R3.3 Server Error Codes
- All endpoints: 500 Internal Server Error (unexpected error)

### R4 — Security Contracts

#### R4.1 Authentication
All endpoints MUST be protected by `JwtAuthGuard` - requires valid JWT token in Authorization header.

#### R4.2 Authorization
All endpoints MUST require `UserRole.ADMIN` via `RolesGuard` and `@Roles(UserRole.ADMIN)` decorator.

#### R4.3 Rate Limiting
- GET /admin/parameters: THROTTLE_ADMIN_DEFAULT (30 requests / 60 minutes)
- GET /admin/parameters/:group: THROTTLE_ADMIN_DEFAULT (30 requests / 60 minutes)
- PUT /admin/parameters/:key: THROTTLE_ADMIN_STRICT (10 requests / 60 minutes)

#### R4.4 Audit Logging
Only PUT /admin/parameters/:key creates audit log entries with:
- Action: 'PARAMETER_UPDATE'
- Resource: 'parameter'
- Timestamp, userId, key, oldValue, newValue

## Scenarios

### Scenario 1: Admin lists all parameters
**Given** admin user with valid JWT token and ADMIN role
**And** system has registered parameters (`EMAIL_PROVIDER`, `MAX_LOGIN_ATTEMPTS`, etc.)
**When** admin sends `GET /admin/parameters`
**Then** response status is 200 OK
**And** response body is array of `ParameterResponseDto[]`
**And** each dto contains key, value, type, group, ttl, default, isOverridden flags
**And** parameters with env overrides have `isOverridden: true`
**And** no audit log is created

### Scenario 2: Admin filters parameters by group
**Given** admin user with valid JWT token and ADMIN role
**And** parameters registered in groups `email`, `auth`, `rate-limit`
**When** admin sends `GET /admin/parameters/email`
**Then** response status is 200 OK
**And** response body is array of `ParameterResponseDto[]`
**And** all returned parameters have `group: "email"`
**And** `isOverridden` flags reflect env overrides for email group
**And** no audit log is created

### Scenario 3: Admin updates parameter successfully
**Given** admin user with valid JWT token and ADMIN role
**And** parameter `EMAIL_PROVIDER` exists in registry (type: string, default: "smtp")
**And** key `EMAIL_PROVIDER` is NOT overridden by environment
**When** admin sends `PUT /admin/parameters/EMAIL_PROVIDER` with body `{ "key": "EMAIL_PROVIDER", "value": "sendgrid" }`
**Then** response status is 200 OK
**And** response body is single `ParameterResponseDto`
**And** dto contains updated value "sendgrid"
**And** `isOverridden: false`
**And** audit log entry is created with action 'PARAMETER_UPDATE'
**And** parameter value is updated in Redis

### Scenario 4: Update rejects env-overridden parameter
**Given** admin user with valid JWT token and ADMIN role
**And** parameter `EMAIL_PROVIDER` exists in registry
**And** environment variable `EMAIL_PROVIDER` is set to "sendgrid"
**When** admin sends `PUT /admin/parameters/EMAIL_PROVIDER` with body `{ "key": "EMAIL_PROVIDER", "value": "resend" }`
**Then** response status is 409 Conflict
**And** response body contains error: "Parameter is overridden by environment variable"
**And** response includes `isOverridden: true`
**And** parameter value in Redis remains "sendgrid"
**And** no audit log is created

### Scenario 5: Update rejects non-existent parameter
**Given** admin user with valid JWT token and ADMIN role
**And** parameter `UNKNOWN_PARAM` does not exist in registry
**When** admin sends `PUT /admin/parameters/UNKNOWN_PARAM` with body `{ "key": "UNKNOWN_PARAM", "value": "test" }`
**Then** response status is 404 Not Found
**And** response body contains error: "Parameter \"UNKNOWN_PARAM\" not found in registry"
**And** response includes key for reference
**And** no audit log is created
**And** Redis remains unchanged

### Scenario 6: Update rejects validation failure (type mismatch)
**Given** admin user with valid JWT token and ADMIN role
**And** parameter `EMAIL_PROVIDER` exists with type "string"
**When** admin sends `PUT /admin/parameters/EMAIL_PROVIDER` with body `{ "key": "EMAIL_PROVIDER", "value": 123 }`
**Then** response status is 422 Unprocessable Entity
**And** response body contains validation error
**And** no audit log is created
**And** parameter value in Redis remains unchanged

### Scenario 7: Admin requests without authentication
**Given** request without JWT token
**When** admin tries to access `GET /admin/parameters`
**Then** response status is 401 Unauthorized
**And** response body contains error: "Unauthorized"
**And** no subsequent processing occurs
**And** no audit log is created

### Scenario 8: Admin requests without admin role
**Given** authenticated user with non-admin role (e.g., "user")
**When** user tries to access `GET /admin/parameters`
**Then** response status is 403 Forbidden
**And** response body contains error: "Access denied. Required roles: [\"ADMIN\"]. Your role: \"user\""
**And** no audit log is created

### Scenario 9: Rate limit for GET endpoints exceeded
**Given** admin user has made 30 requests to `GET /admin/parameters` within last 60 minutes
**And** rate limit header shows `X-RateLimit-Remaining: 0`
**When** admin makes one more request to `GET /admin/parameters`
**Then** response status is 429 Too Many Requests
**And** response body contains error: "Too many requests"
**And** rate limit resets after waiting

### Scenario 10: Stricter rate limit for PUT endpoint exceeded
**Given** admin user has made 10 requests to `PUT /admin/parameters/:key` within last 60 minutes
**And** PUT rate limit header shows `X-RateLimit-Remaining: 0`
**When** admin makes one more request to `PUT /admin/parameters/EMAIL_PROVIDER`
**Then** response status is 429 Too Many Requests
**And** response body contains error: "Too many requests"
**And** PUT rate limit resets separately from GET rate limits

### Scenario 11: Empty group returns empty array
**Given** admin user with valid JWT token and ADMIN role
**And** no parameters registered with group "empty-group"
**When** admin sends `GET /admin/parameters/empty-group`
**Then** response status is 200 OK
**And** response body is empty array `[]`
**And** no error is generated
**And** no audit log is created

### Scenario 12: Expired Redis entry uses default
**Given** parameter `EMAIL_PROVIDER` with default "smtp" and Redis entry expired
**And** no environment variable override
**When** admin sends `GET /admin/parameters`
**Then** response includes parameter with `value: "smtp"`
**And** `isOverridden: false`
**And** Redis is seeded with default value and TTL
**And** new Redis entry timestamp is current