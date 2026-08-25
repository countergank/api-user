# Parameter Admin Specification

## Purpose

Admin API for runtime parameter management with strict authentication, authorization, and audit controls. Provides admin-only access to view and update parameter values while protecting against environment variable overrides and ensuring proper validation.

## Requirements

### Requirement: Admin Controller - Parameter Admin Module

The system MUST provide a `ParameterAdminController` with 3 endpoints under `/admin/parameters` path:

- `GET /admin/parameters` lists all parameters with runtime values
- `GET /admin/parameters/:group` lists parameters filtered by group
- `PUT /admin/parameters/:key` updates a parameter's runtime value

All endpoints MUST require admin privileges and strict rate limiting.

#### Scenario: Admin lists all parameters

- GIVEN admin requests `GET /admin/parameters`
- WHEN the endpoint processes the request
- THEN it returns all parameter definitions with current runtime values
- AND includes `isOverridden: true` for parameters with env var overrides
- AND returns HTTP 200 with `ParameterResponseDto[]`
- AND creates no audit log entry

#### Scenario: Admin filters parameters by group

- GIVEN admin requests `GET /admin/parameters/:group` with group `email`
- WHEN the endpoint processes the request
- THEN it returns only parameters with `group: "email"`
- AND includes `isOverridden: true` for overridden params
- AND returns HTTP 200 with `ParameterResponseDto[]`
- AND creates no audit log entry

#### Scenario: Admin updates parameter value

- GIVEN admin requests `PUT /admin/parameters/:key` with key `EMAIL_PROVIDER` and value `"sendgrid"`
- AND the key exists in registry with type `string`
- AND no environment variable overrides the key
- WHEN the endpoint processes the request
- THEN it updates the parameter's runtime value in Redis
- AND returns the updated parameter as `ParameterResponseDto`
- AND returns HTTP 200
- AND creates an audit log entry with action `PARAMETER_UPDATE`

### Requirement: ParameterService Extensions

The system MUST extend `ParameterService` with two new methods:

- `getAll()`: Returns all parameter definitions with current runtime values
- `getByGroup(group: string)`: Returns parameters filtered by group name

#### Scenario: Service retrieves all parameters

- GIVEN `ParameterService.getAll()` is called
- WHEN all parameters are retrieved from store
- THEN it returns an array of `ParameterResponseDto`
- AND includes `isOverridden: true` for params with env var overrides

#### Scenario: Service filters parameters by group

- GIVEN `ParameterService.getByGroup("email")` is called
- WHEN parameters are filtered by group
- THEN it returns only `ParameterResponseDto[]` for the specified group
- AND includes `isOverridden: true` for overridden params

### Requirement: ParameterStore Extensions

The system MUST extend `ParameterStore` with two new methods:

- `getAll()`: Returns all parameter definitions with current runtime values
- `getByGroup(group: string)`: Returns parameters filtered by group name

#### Scenario: Store retrieves all parameters

- GIVEN `ParameterStore.getAll()` is called
- WHEN all parameter definitions are retrieved from registry
- THEN it returns an array of `ParameterDefinition`

#### Scenario: Store filters parameters by group

- GIVEN `ParameterStore.getByGroup("email")` is called
- WHEN parameters are filtered by `group: "email"`
- THEN it returns only `ParameterDefinition[]` for the specified group

### Requirement: DTOs - ParameterResponseDto

The system MUST provide `ParameterResponseDto` with the following structure:

```typescript
{
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  group: string;
  ttl: number;
  default: string | number | boolean;
  isOverridden: boolean;  // true if env var overrides Redis value
}
```

#### Scenario: DTO validation success

- GIVEN valid parameter response data with all required fields
- WHEN DTO validation is performed
- THEN validation passes
- AND the data is parsed into `ParameterResponseDto`

#### Scenario: DTO validation failure

- GIVEN missing required field in response data
- WHEN DTO validation is performed
- THEN validation fails
- AND returns HTTP 422 with descriptive error

### Requirement: DTOs - UpdateParameterDto

The system MUST provide `UpdateParameterDto` for parameter updates:

```typescript
{
  key: string;           // MUST exist in registry
  value: string | number | boolean;  // MUST match registry type
}
```

#### Scenario: DTO validation success for update

- GIVEN valid update data with existing key `EMAIL_PROVIDER` and value `"sendgrid"`
- WHEN DTO validation is performed
- THEN validation passes
- AND the data is parsed into `UpdateParameterDto`

#### Scenario: DTO validation failure for missing key

- GIVEN update data with non-existent key `UNKNOWN_PARAM`
- WHEN DTO validation is performed
- THEN validation fails with error "Parameter not found in registry"

#### Scenario: DTO validation failure for type mismatch

- GIVEN update data with key `EMAIL_PROVIDER` and value `123` (number)
- WHEN registry validates the value type
- THEN validation fails with error "Value type mismatch"

### Requirement: Security Guards and Rate Limiting

The system MUST enforce:

1. **Authentication**: `JwtAuthGuard` - valid JWT token required
2. **Authorization**: `RolesGuard` with `@Roles(UserRole.ADMIN)` - admin role required
3. **Rate Limiting**: Stricter than public endpoints (30/min default, 10/min for PUT)

#### Scenario: Endpoint security protection

- GIVEN unauthenticated request to `GET /admin/parameters`
- WHEN request is processed
- THEN it returns HTTP 401 with error "Unauthorized"
- AND guards block access

#### Scenario: Endpoint authorization enforcement

- GIVEN authenticated user without admin role requests `GET /admin/parameters`
- WHEN request is processed
- THEN it returns HTTP 403 with error "Access denied. Admin role required"

#### Scenario: Rate limiting enforcement

- GIVEN admin makes 31 requests to `GET /admin/parameters` within 1 minute
- WHEN 31st request is processed
- THEN it returns HTTP 429 with error "Too many requests"
- AND resets rate limit counter

#### Scenario: Stricter rate limiting for PUT

- GIVEN admin makes 11 requests to `PUT /admin/parameters/:key` within 1 minute
- WHEN 11th request is processed
- THEN it returns HTTP 429 with error "Too many requests"
- AND resets PUT rate limit counter separately

### Requirement: Error Handling

The system MUST handle error cases as follows:

#### Scenario: GET 404 for unknown key

- GIVEN admin requests `GET /admin/parameters` with non-existent key in path
- WHEN the endpoint processes the request
- THEN it returns HTTP 400 with error "Key parameter required"

#### Scenario: PUT 409 for env-overridden key

- GIVEN admin requests `PUT /admin/parameters/:key` with key `EMAIL_PROVIDER`
- AND environment variable `EMAIL_PROVIDER` is set (value `"sendgrid"`)
- WHEN the endpoint processes the request
- THEN it returns HTTP 409 with error "Parameter is overridden by environment variable"
- AND includes `isOverridden: true` in response

#### Scenario: PUT 422 for validation failure

- GIVEN admin requests `PUT /admin/parameters/:key` with invalid value type
- WHEN the endpoint performs validation
- THEN it returns HTTP 422 with error "Parameter validation failed: Value type mismatch"

#### Scenario: PUT 404 for non-existent key

- GIVEN admin requests `PUT /admin/parameters/:key` with non-existent key `UNKNOWN"
- WHEN the endpoint processes the request
- THEN it returns HTTP 404 with error "Parameter \"UNKNOWN\" not found in registry"

### Requirement: Edge Cases - Env-overridden Parameters

The system MUST properly handle parameters overridden by environment variables:

#### Scenario: Env-overridden param shows isOverridden flag

- GIVEN parameter `EMAIL_PROVIDER` with default `"smtp"` in registry
- AND environment variable `EMAIL_PROVIDER=\"sendgrid\"` is set
- WHEN admin requests `GET /admin/parameters`
- THEN response includes `isOverridden: true` for `EMAIL_PROVIDER`
- AND `value: \"sendgrid\"` (the env var value)

#### Scenario: PUT rejects env-overridden param

- GIVEN parameter `EMAIL_PROVIDER` with env var set to `\"sendgrid\"`
- WHEN admin attempts to `PUT /admin/parameters/EMAIL_PROVIDER` with value `\"resend\"`
- THEN it returns HTTP 409 with error "Cannot update param overridden by environment"

#### Scenario: Empty group returns empty array

- GIVEN admin requests `GET /admin/parameters/empty-group`
- WHEN the endpoint processes the request
- THEN it returns HTTP 200 with empty array `[]`
- AND creates no error

#### Scenario: Expired Redis entries fallback

- GIVEN parameter `EMAIL_PROVIDER` with Redis TTL 300s
- AND Redis entry expired 1 hour ago
- WHEN admin requests `GET /admin/parameters`
- THEN it skips expired Redis entry
- AND uses registry default value
- AND returns `isOverridden: false` (if no env override)