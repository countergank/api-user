# Proposal: ParameterService — Redis Backend

> **Linear**: COU-182 — [PERF-17] ParameterService — Servicio de parámetros con Redis

## Intent

75+ scattered env var access points use 3 inconsistent patterns (`process.env`, `ConfigService.get`, `parseInt` in decorators). COU-141 delivered `AppConfigService` as a typed wrapper, but it's still a read-only mirror of `process.env`. This change adds a **runtime-configurable parameter registry backed by Redis**, enabling admin-driven parameter changes without redeployment and providing a single typed API for all configuration.

## Scope

### In Scope
- Registry: typed parameter definitions with defaults, validation, groups
- Redis backend: cache-aside pattern using existing RedisService/CacheService
- In-memory L1 cache for hot reads (TTL configurable per parameter)
- `ParameterService` as `@Global()` NestJS module
- Graceful fallback to env defaults when Redis is unavailable
- Unit + integration tests (strict TDD)

### Out of Scope
- Migration of all 75+ consumers to use ParameterService (incremental, COU-144+)
- Admin API/UI for runtime parameter editing (separate ticket)
- Decorator-context migration (`@Throttle` in auth.controller.ts — documented exception)
- MongoDB-backed storage (overkill; Redis already available)

## Capabilities

### New Capabilities
- `parameter-registry`: Typed parameter definitions with defaults, validation rules, groups, and metadata
- `parameter-store`: Redis-backed storage with in-memory cache, TTL, fallback behavior

### Modified Capabilities
- `config-validation`: env.validation.ts types must be exported and consumed by the parameter registry as default source

## Approach

Registry + Redis Backend (recommended from exploration):

1. `src/config/parameters/` module with: `parameter-registry.ts` (definitions), `parameter.service.ts` (get/set/has/delete), `parameter.module.ts` (global), `parameter.types.ts` (interfaces)
2. Registry defines each parameter as `{ key, type, default, group, ttl, validate? }`
3. On read: check L1 memory cache → Redis → registry default. Populate cache on miss.
4. On write: update Redis + invalidate L1 cache. Publish change event for downstream invalidation.
5. On startup: seed Redis from registry defaults if key missing (first-run bootstrap).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/config/parameters/` | New | Registry, service, module, types |
| `src/config/app-config.service.ts` | Modified | Extend or delegate to ParameterService |
| `src/config/env.validation.ts` | Modified | Export types for registry consumption |
| `src/config/config.module.ts` | Modified | Import ParameterModule |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Redis unavailable at startup | Medium | Graceful fallback to env defaults; parameter reads never throw |
| In-memory cache staleness | Low | TTL-based invalidation; event-driven cache busting on writes |
| Migration complexity for consumers | High | COU-182 creates the service only; migration is incremental (COU-144+) |

## Rollback Plan

1. Remove `src/config/parameters/` module
2. Revert `config.module.ts` to pre-import state
3. Revert `app-config.service.ts` changes
4. No data migration to undo — Redis keys are ephemeral (TTL-bounded)
5. Run `npm test` to confirm green

## Dependencies

- Existing `RedisService` (Global module) — already available
- Existing `CacheService` — reuse or extend for L1 caching
- COU-141 (AppConfigService) — already delivered and archived

## Success Criteria

- [ ] `ParameterService` registered as `@Global()` module
- [ ] Registry supports typed parameter definitions with defaults and validation
- [ ] Redis read/write works with graceful fallback on connection failure
- [ ] In-memory cache reduces Redis reads on hot paths (verified via unit test)
- [ ] All existing tests pass (`npm test`)
- [ ] At least one consumer migrated as proof-of-concept (e.g., `EMAIL_PROVIDER`)

## Proposal Question Round

> **For user review** — these questions help sharpen the proposal before finalizing:

1. **First consumer migration**: Which parameter should we migrate as the proof-of-concept? `EMAIL_PROVIDER` is a clean candidate (1 consumer, injectable). Or skip migration entirely in COU-182?
2. **Cache TTL defaults**: Should all parameters share a default TTL (e.g., 5 minutes) or should TTL be part of each parameter's registry definition from day one?
3. **Startup seeding**: When Redis is empty (first deploy), should the service seed ALL registry defaults, or only on first access? Seed-all is simpler but adds startup latency.
