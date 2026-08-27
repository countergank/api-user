# Parameter Store Specification

## Purpose

Redis-backed storage with in-memory L1 cache, TTL, and graceful fallback when Redis is unavailable.

## Requirements

### Requirement: Read Path — L1 → Redis → Default

The store SHALL read parameters in priority order: L1 memory cache → Redis → registry default. On cache miss, the value is populated forward to fill the missing layer.

#### Scenario: L1 cache hit

- GIVEN `EMAIL_PROVIDER` is in the L1 cache with value `"sendgrid"`
- WHEN the store reads `EMAIL_PROVIDER`
- THEN it returns `"sendgrid"` without calling Redis

#### Scenario: L1 miss, Redis hit

- GIVEN `EMAIL_PROVIDER` is NOT in L1 cache
- AND Redis contains `EMAIL_PROVIDER` with value `"sendgrid"`
- WHEN the store reads `EMAIL_PROVIDER`
- THEN it returns `"sendgrid"`
- AND L1 cache is populated with the value

#### Scenario: L1 miss, Redis miss — fallback to registry default

- GIVEN `EMAIL_PROVIDER` is NOT in L1 cache
- AND Redis does not contain `EMAIL_PROVIDER`
- WHEN the store reads `EMAIL_PROVIDER`
- THEN it returns the registry default (`"smtp"`)
- AND the registry default is written to Redis and L1 cache

### Requirement: Write Path — Redis + L1 Invalidation

The store SHALL write to Redis and invalidate the L1 cache entry on every write. A change event MUST be published for downstream invalidation.

#### Scenario: Write updates Redis and invalidates L1

- GIVEN `EMAIL_PROVIDER` is in L1 cache
- WHEN the store writes `EMAIL_PROVIDER = "sendgrid"`
- THEN Redis is updated with value `"sendgrid"`
- AND L1 cache entry for `EMAIL_PROVIDER` is evicted
- AND a change event is published with key `EMAIL_PROVIDER`

#### Scenario: Write after Redis failure

- GIVEN Redis is unavailable
- WHEN the store writes `EMAIL_PROVIDER = "sendgrid"`
- THEN the write MUST NOT throw
- AND the L1 cache is updated as a local fallback
- AND a warning is logged

### Requirement: TTL Expiration

Each parameter's cache entry SHALL expire after its configured TTL. Expired entries MUST be re-fetched from the next layer.

#### Scenario: TTL expiration triggers re-fetch

- GIVEN `EMAIL_PROVIDER` was cached in L1 with TTL 300s
- AND 300 seconds have elapsed
- WHEN the store reads `EMAIL_PROVIDER`
- THEN L1 cache miss occurs
- AND Redis is queried (which may also be expired)
- AND the correct current value is returned

### Requirement: Graceful Fallback on Redis Unavailable

The store SHALL NEVER throw when Redis is unavailable. All reads MUST return a value (registry default at minimum). Writes MUST be silently degraded with a warning log.

#### Scenario: Redis connection failure during read

- GIVEN Redis connection is down
- WHEN the store reads `EMAIL_PROVIDER`
- THEN it returns the registry default (`"smtp"`)
- AND a warning is logged (no exception thrown)

#### Scenario: Redis connection failure during write

- GIVEN Redis connection is down
- WHEN the store writes `EMAIL_PROVIDER = "sendgrid"`
- THEN no exception is thrown
- AND L1 cache is updated locally
- AND a warning is logged indicating write was not persisted

#### Scenario: Redis recovers after failure

- GIVEN Redis was unavailable and has now recovered
- WHEN the store reads `EMAIL_PROVIDER`
- THEN L1 miss triggers a Redis query
- AND the correct value from Redis is returned
- AND L1 cache is re-populated

### Requirement: Startup Seeding

On first access to a parameter, the store SHALL seed Redis from the registry default if the key is missing. This avoids startup latency while ensuring Redis is populated.

#### Scenario: First access seeds Redis

- GIVEN Redis is empty (first deploy)
- WHEN the store reads `EMAIL_PROVIDER`
- THEN the registry default is returned
- AND the default is written to Redis with configured TTL

#### Scenario: Existing Redis key is not overwritten

- GIVEN Redis contains `EMAIL_PROVIDER = "sendgrid"` (manually set)
- WHEN the store reads `EMAIL_PROVIDER`
- THEN `"sendgrid"` is returned
- AND the registry default is NOT written to Redis

---

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