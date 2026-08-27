# Parameter Service — Static Holder Specification

## Purpose

Define the modifications to `ParameterService` and `ParameterModule` needed to support the `@Parameter()` decorator's static service holder pattern.

## Requirements

### Requirement: ParameterService exposes static accessor

`ParameterService` SHALL expose a static `instance: ParameterService | null` field and a static `ensureInitialized(): ParameterService` accessor. The static `instance` SHALL be set by the service instance itself during `onApplicationBootstrap`.

#### Scenario: Static instance is set on application bootstrap

- GIVEN the application starts and modules are initialized
- WHEN `onApplicationBootstrap` lifecycle hook fires
- THEN `ParameterService.instance` SHALL reference the singleton service instance

#### Scenario: Static accessor returns the service instance

- GIVEN `onApplicationBootstrap` has completed
- WHEN code calls `ParameterService.ensureInitialized()`
- THEN it SHALL return the non-null service instance

#### Scenario: Static accessor throws if called before bootstrap

- GIVEN `onApplicationBootstrap` has NOT yet run
- WHEN code calls `ParameterService.ensureInitialized()`
- THEN it SHALL throw an error with message indicating the service is not yet initialized

### Requirement: ParameterModule ensures initialization

`ParameterModule` SHALL call `onApplicationBootstrap` as part of its lifecycle so the static holder is set before any HTTP request is processed.

#### Scenario: Decorator can call ensureInitialized during request

- GIVEN the application has fully bootstrapped
- AND a controller method decorated with `@Parameter('EMAIL_HOST')` is invoked
- WHEN `createParamDecorator` factory calls `ParameterService.ensureInitialized().get('EMAIL_HOST')`
- THEN it SHALL return the correct value without errors

---

## Purpose

Define ParameterService extensions for admin endpoints: getAll() and getByGroup() methods that return parameter definitions with runtime values.

## Requirements

### R1 — getAll() Method Contract

The system SHALL extend `ParameterService` with a `getAll()` method:

- **Signature**: `async getAll(): Promise<ParameterResponseDto[]>`
- **Purpose**: Returns all parameter definitions with current runtime values
- **Validation**: Runs through admin DTO validation
- **Security**: Requires admin role via guard chain
- **Rate Limit**: THROTTLE_ADMIN_DEFAULT (30/min)

#### R1.1 getAll() Response Shape

The system SHALL return `ParameterResponseDto[]` where each dto contains:
- `key`: Parameter identifier (e.g., "EMAIL_PROVIDER")
- `value`: Current runtime value (string | number | boolean) from Redis/L1/env
- `type`: Parameter type from registry ('string' | 'number' | 'boolean')
- `group`: Parameter group from registry
- `ttl`: Time-to-live in seconds from registry
- `default`: Default value from registry
- `isOverridden`: Boolean indicating if env var overrides Redis value

### R2 — getByGroup() Method Contract

The system SHALL extend `ParameterService` with a `getByGroup(group: string)` method:

- **Signature**: `async getByGroup(group: string): Promise<ParameterResponseDto[]>`
- **Purpose**: Returns parameters filtered by group name
- **Validation**: Group name validation via DTO
- **Security**: Requires admin role via guard chain
- **Rate Limit**: THROTTLE_ADMIN_DEFAULT (30/min)

#### R2.1 getByGroup() Response Shape

The system SHALL return filtered `ParameterResponseDto[]` containing only parameters matching the specified group.

### R3 — Integration with ParameterStore

#### R3.1 ParameterStore.getAll()

The system SHALL extend `ParameterStore` with a `getAll()` method:
- **Signature**: `async getAll(): Promise<ParameterDefinition[]>`
- **Purpose**: Returns all parameter definitions from registry
- **No Security**: Public method, used internally by admin controller
- **No Rate Limiting**: Internal method

#### R3.2 ParameterStore.getByGroup()

The system SHALL extend `ParameterStore` with a `getByGroup(group: string)` method:
- **Signature**: `async getByGroup(group: string): Promise<ParameterDefinition[]>`
- **Purpose**: Returns parameters filtered by group
- **No Security**: Public method, used internally by admin controller
- **No Rate Limiting**: Internal method

## Scenarios

### Scenario 1: Admin calls service.getAll()
**Given** admin user with valid JWT token and ADMIN role
**And** service has access to ParameterStore and ParameterRegistry
**When** admin controller calls `service.getAll()`
**Then** service returns array of `ParameterResponseDto[]`
**And** each dto contains runtime values from appropriate layer (env > Redis > default)
**And** `isOverridden: true` for parameters with env overrides
**And** response respects THROTTLE_ADMIN_DEFAULT rate limit

### Scenario 2: Admin calls service.getAll() with no parameters
**Given** admin user with valid JWT token and ADMIN role
**And** no parameters registered in registry
**When** admin controller calls `service.getAll()`
**Then** service returns empty array `[]`
**And** response status is 200 OK
**And** rate limit applies correctly

### Scenario 3: Admin calls service.getByGroup('email')
**Given** admin user with valid JWT token and ADMIN role
**And** parameters registered in groups: 'email', 'auth', 'rate-limit'
**And** email group has parameters: 'EMAIL_PROVIDER', 'EMAIL_VERIFICATION_CODE_EXPIRY'
**When** admin controller calls `service.getByGroup('email')`
**Then** service returns array of `ParameterResponseDto[]` for email group only
**And** all returned parameters have `group: "email"`
**And** `isOverridden: true` for params with env overrides
**And** parameters from other groups are excluded

### Scenario 4: Admin calls service.getByGroup('empty-group')
**Given** admin user with valid JWT token and ADMIN role
**And** no parameters registered with group 'empty-group'
**When** admin controller calls `service.getByGroup('empty-group')`
**Then** service returns empty array `[]`
**And** response status is 200 OK

### Scenario 5: Service handles Redis store failures
**Given** ParameterService with ParameterStore that has Redis connectivity issues
**And** admin calls `service.getAll()`
**When** store.getAll() encounters Redis failure
**Then** service returns array with default values
**And** `isOverridden: false` for all parameters
**And** warning logs are generated
**And** response still returns 200 OK

### Scenario 6: Service enforces admin security
**Given** non-admin user with valid JWT token attempts to call `service.getAll()`
**When** request reaches service layer
**Then** RolesGuard blocks access before reaching service
**And** response status is 403 Forbidden
**And** service method is not executed

### Scenario 6: GET /admin/parameters rate limit monitoring
**Given** admin user making 29 requests to GET /admin/parameters within 59 minutes
**And** rate limit window is 60 minutes
**And** THROTTLE_ADMIN_DEFAULT limit is 30/min
**When** admin makes 30th request
**Then** service allows request
**And** X-RateLimit-Remaining header shows 0 or 1
**And** service returns 200 OK with data

### Scenario 7: Service validation of parameter types
**Given** ParameterService with ParameterRegistry containing 'EMAIL_PROVIDER' (type: string)
**And** ParameterStore with Redis values
**When** service processes parameter 'EMAIL_PROVIDER' with value 'sendgrid'
**Then** service validates type matches registry
**And** returns correct type in dto: `type: 'string'`
**And** value is preserved as string
**And** service throws error for type mismatch (e.g., number for string param)

### Scenario 8: Service handles expired Redis entries
**Given** parameter 'EMAIL_PROVIDER' with registry default 'smtp' and TTL 300s
**And** Redis entry expired 1 hour ago
**And** no env override
**When** admin calls `service.getAll()`
**Then** service skips expired Redis entry
**And** returns registry default value 'smtp'
**And** `isOverridden: false`
**And** system re-seeds Redis with default and new TTL