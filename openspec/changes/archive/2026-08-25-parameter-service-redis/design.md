# Design: ParameterService — Redis Backend

> **Change**: parameter-service-redis | **Linear**: COU-182

## Technical Approach

Introduce a `ParameterModule` in `src/config/parameters/` with three responsibilities: **registry** (typed parameter definitions as a compile-time constant), **store** (two-tier cache: L1 in-memory Map + Redis via `RedisService`), and **service** (NestJS `@Injectable()` exposing `get/set/has/delete`). The registry is a pure TypeScript object validated at startup; the store delegates Redis I/O to the existing `RedisService` (ioredis wrapper) and adds a per-key `Map<string, {value, expiresAt}>` as L1. The module is `@Global()` and imported once in `AppModule`.

**Specs mapped**: parameter-registry (4 req, 10 scenarios), parameter-store (5 req, 13 scenarios), config-validation (1 req, 2 scenarios).

## Architecture Decisions

| Decision | Option A | Option B | Option C | Tradeoff | Decision |
|----------|----------|----------|----------|----------|----------|
| L1 cache structure | `Map<string, {value, expiresAt}>` | Extend `CacheService` | Use `node-cache` | A: minimal, zero deps, full control. B: reuses existing but adds indirection + `cache:` prefix collision risk. C: adds dependency. | **A** — avoids coupling to CacheService's prefix/TTL semantics; parameter cache has different semantics (registry defaults, typed keys). |
| Registry storage | `Map` constant object | Decorator-based (`@Parameter()`) | JSON file | A: simple, tree-shakeable, no reflection. B: elegant but needs metadata scanning (complex). C: external config but loses type safety. | **A** — flat constant map is explicit, testable, and aligns with spec's `{ key, type, default, group, ttl, validate }` shape. |
| Redis key prefix | `param:` (not `cache:`) | Reuse `cache:` prefix | No prefix | A: avoids collision with CacheService. B: collides. C: namespace risk. | **A** — `CacheService` owns `cache:*` keys; parameters need independent namespace for independent TTL/eviction. |
| Global module | Yes (`@Global()`) | Feature-scoped | Both (global + feature) | Global: any module injects without imports. Feature: explicit but verbose. | **Yes** — matches existing pattern (RedisModule, CacheModule, AppConfigModule are all `@Global()`). |
| Env override source | Import `EnvironmentVariables` class | Read `ConfigService` at init | Both | Class: type-safe, compile-time. ConfigService: runtime, already validates. | **Both** — `ConfigService` for runtime values (already validated by `env.validation.ts`); registry definition references keys by string. |

## Data Flow

### Read Path (L1 → Redis → Default)

```
Consumer.get("EMAIL_PROVIDER")
    │
    ▼
ParameterService.get(key)
    │
    ├─ L1 Map hit? ──→ return value (no I/O)
    │
    ├─ L1 miss
    │   │
    │   ▼
    │   Redis.get("param:EMAIL_PROVIDER")
    │   │
    │   ├─ Redis hit? ──→ populate L1, return value
    │   │
    │   └─ Redis miss
    │       │
    │       ▼
    │       Registry.getDefault("EMAIL_PROVIDER")
    │       │
    │       ├─ default found? ──→ seed Redis + L1, return default
    │       └─ no definition? ──→ throw ParameterNotFoundError
    │
    ▼
return value
```

### Write Path (Redis + L1 Invalidation)

```
Consumer.set("EMAIL_PROVIDER", "sendgrid")
    │
    ▼
ParameterService.set(key, value)
    │
    ├─ Validate against registry rules ──→ throw if invalid
    │
    ├─ Redis.set("param:EMAIL_PROVIDER", "sendgrid", ttl)
    │   │
    │   └─ Redis fail? ──→ log warning, skip
    │
    ├─ L1.delete("EMAIL_PROVIDER")
    │
    └─ EventEmitter.emit("parameter.changed", { key, value })
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/config/parameters/parameter.types.ts` | Create | Interfaces: `ParameterDefinition`, `ParameterKey`, `ParameterGroup`, `L1Entry<T>` |
| `src/config/parameters/parameter-registry.ts` | Create | `PARAMETER_REGISTRY` constant Map + `registerParameter()` + `getDefinition()` + `findByGroup()` + `listGroups()` |
| `src/config/parameters/parameter-store.ts` | Create | `ParameterStore` — L1 Map + Redis read/write with TTL, fallback, seeding |
| `src/config/parameters/parameter.service.ts` | Create | `ParameterService` — `get<T>()`, `set<T>()`, `has()`, `delete()`, typed getters per parameter |
| `src/config/parameters/parameter.module.ts` | Create | `@Global() ParameterModule`, imports nothing extra (RedisService is global) |
| `src/config/parameters/index.ts` | Create | Barrel export |
| `src/app/app.module.ts` | Modify | Add `ParameterModule` to imports array (after `CacheModule`) |
| `src/config/app-config.service.ts` | Modify | Delegate typed getters to `ParameterService.get()` instead of `ConfigService.get()` |
| `src/config/env.validation.ts` | Modify | Ensure `EnvironmentVariables` class is exported (already is — no change needed, verify) |

## Interfaces / Contracts

```typescript
// parameter.types.ts
type ParameterType = 'string' | 'number' | 'boolean';

interface ParameterDefinition<T = unknown> {
  key: string;
  type: ParameterType;
  default: T;
  group: string;
  ttl: number;               // seconds
  validate?: (value: T) => boolean;
}

interface L1Entry<T> {
  value: T;
  expiresAt: number;         // Date.now() + ttl*1000
}

// parameter.service.ts
@Injectable()
export class ParameterService {
  get<T>(key: string): T;
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  delete(key: string): void;
  findByGroup(group: string): ParameterDefinition[];
  listGroups(): string[];
}
```

Redis key format: `param:{KEY}` — e.g., `param:EMAIL_PROVIDER`. Value: JSON-serialized with `CacheEntry`-like `{ data, expiresAt }` wrapper for TTL tracking at Redis level.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Registry: definitions, duplicate rejection, type validation, group queries | Jest — pure functions, no I/O mocks needed |
| Unit | Store: L1 hit/miss, Redis delegation, TTL expiry, fallback, seeding | Jest — mock `RedisService` (same pattern as `cache.service.spec.ts`) |
| Unit | Service: get/set/has/delete integration, validation enforcement | Jest — mock `ParameterStore` |
| Integration | Full read/write flow with real Redis | Jest + `Test.createTestingModule()` with real `RedisService` (if Redis available) or mock |
| E2E | Parameter changes propagate via EventEmitter | Jest — subscribe to events, trigger write, verify emission |

**TDD**: RED-GREEN-REFACTOR per task. Write test first, verify fail, implement, verify pass.

## Migration / Rollout

No migration required. Redis keys are ephemeral (TTL-bounded). On first deploy:
1. Redis is empty → store seeds defaults on first access per spec.
2. Existing `AppConfigService` getters delegate to `ParameterService` — transparent to consumers.
3. `env.validation.ts` already exports `EnvironmentVariables` — no breaking change.

## Open Questions

- [ ] Should `ParameterService.get()` return `T | undefined` (nullable) or always `T` (throw on missing)? **Recommendation**: `T` with `ParameterNotFoundError` for undefined keys — forces consumers to handle explicitly.
- [ ] EventEmitter vs RxJS Subject for change events? **Recommendation**: EventEmitter (NestJS already has `EventEmitterModule` imported in `AppModule`).
