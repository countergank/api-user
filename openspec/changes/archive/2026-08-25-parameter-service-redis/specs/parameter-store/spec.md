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
