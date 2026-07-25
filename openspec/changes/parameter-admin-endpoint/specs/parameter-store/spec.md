# Spec: parameter-store

## Purpose

Define ParameterStore extensions for admin endpoints: getAll() and getByGroup() methods that return parameter definitions with runtime values and security protections.

## Requirements

### R1 — getAll() Method Contract

The system SHALL extend `ParameterStore` with a `getAll()` method:

- **Signature**: `async getAll(): Promise<ParameterDefinition[]>`
- **Purpose**: Returns all parameter definitions from ParameterRegistry
- **Access**: Public method, no security guards at store level
- **Rate Limit**: No rate limiting at store level (endpoint level enforces)
- **Dependencies**: Uses ParameterRegistry (injected via constructor)

#### R1.1 getAll() Response Shape

The system SHALL return `ParameterDefinition[]` where each definition contains:
- `key`: Parameter identifier (e.g., "EMAIL_PROVIDER")
- `type`: Parameter type ('string' | 'number' | 'boolean')
- `default`: Default value (string | number | boolean)
- `group`: Parameter group (e.g., "email")
- `ttl`: Time-to-live in seconds
- `validate`: Optional validation function

### R2 — getByGroup() Method Contract

The system SHALL extend `ParameterStore` with a `getByGroup(group: string)` method:

- **Signature**: `async getByGroup(group: string): Promise<ParameterDefinition[]>`
- **Purpose**: Returns parameters filtered by group name
- **Access**: Public method, no security guards at store level
- **Rate Limit**: No rate limiting at store level (endpoint level enforces)
- **Validation**: Group parameter validation

#### R2.1 getByGroup() Response Shape

The system SHALL return filtered `ParameterDefinition[]` containing only parameters matching the specified group.

### R3 — Security and Error Handling

#### R3.1 Unknown Group Handling
When `getByGroup()` is called with a group that doesn't exist:
- The system SHALL return empty array `[]`
- No error should be thrown
- Method should log warning for debugging (optional)

#### R3.2 ParameterRegistry Dependency
The store MUST have access to ParameterRegistry via constructor injection.
If registry is not available, method should throw descriptive error.

## Scenarios

### Scenario 1: Admin calls store.getAll() for first time
**Given** admin requests `GET /admin/parameters`
**And** ParameterStore has ParameterRegistry with parameters: 'EMAIL_PROVIDER', 'MAX_LOGIN_ATTEMPTS'
**When** admin controller calls `store.getAll()`
**Then** store returns all parameter definitions as `ParameterDefinition[]`
**And** each definition includes key, type, default, group, ttl, validate
**And** method completes without throwing errors
**And** Redis/L1 cache is not accessed (this is a definition-only method)

### Scenario 2: Admin calls store.getAll() with no parameters
**Given** admin requests `GET /admin/parameters`
**And** ParameterRegistry has no registered parameters
**When** admin controller calls `store.getAll()`
**Then** store returns empty array `[]`
**And** method completes successfully
**And** no Redis operations occur

### Scenario 3: Admin calls store.getByGroup('email')
**Given** admin requests `GET /admin/parameters/email`
**And** ParameterRegistry has parameters: 'EMAIL_PROVIDER' (group:'email'), 'MAX_LOGIN_ATTEMPTS' (group:'auth')
**When** admin controller calls `store.getByGroup('email')`
**Then** store returns only 'EMAIL_PROVIDER' as ParameterDefinition
**And** all returned definitions have `group: 'email'`
**And** 'MAX_LOGIN_ATTEMPTS' is excluded (different group)

### Scenario 4: Admin calls store.getByGroup('empty-group')
**Given** admin requests `GET /admin/parameters/empty-group`
**And** ParameterRegistry has no parameters with group 'empty-group'
**When** admin controller calls `store.getByGroup('empty-group')`
**Then** store returns empty array `[]`
**And** method completes without throwing error
**And** no audit log is required

### Scenario 5: Store handles registry dependency issues
**Given** ParameterStore initialized without ParameterRegistry
**And** admin calls `store.getByGroup('email')`
**When** method attempts to access registry
**Then** method should throw descriptive error
**And** controller should catch error and return 500 Internal Server Error
**And** audit log should not be created

### Scenario 6: Store performance with large parameter set
**Given** ParameterRegistry has 100+ parameters
**And** admin calls `store.getAll()`
**Then** store returns all 100+ parameters
**And** operation completes within 100ms
**And** no Redis operations are performed
**And** no caching is required

### Scenario 7: Store handles invalid group name
**Given** admin requests `GET /admin/parameters/` with empty path segment
**And** route validates group parameter
**And** group parameter is empty string
**When** admin controller calls `store.getByGroup('')`
**Then** store should throw validation error
**And** controller should return 400 Bad Request
**And** no parameters are returned
**And** no audit log is created