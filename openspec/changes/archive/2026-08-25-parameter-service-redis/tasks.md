# Tasks: ParameterService — Redis Backend

> **Linear**: COU-182 — [PERF-17] ParameterService — Servicio de parámetros con Redis

## Phase 1: Foundation

### 1.1 Create parameter types
- [x] **File**: `src/config/parameters/parameter.types.ts`
- **Estimated lines**: ~45
- **Spec reference**: parameter-registry REQ-1
- **Description**: Define TypeScript interfaces for ParameterDefinition, ParameterGroup, ParameterValue, ParameterMetadata
- **Acceptance**: Types compile, exported from index

### 1.2 Create parameter registry
- [x] **File**: `src/config/parameters/parameter-registry.ts`
- **Estimated lines**: ~80
- **Spec reference**: parameter-registry REQ-2, REQ-3
- **Description**: Typed constant defining all parameters with key, type, default, group, ttl, validation rules. Include throttle, lockout, audit, email, token groups
- **Acceptance**: Registry exported, all parameters have types and defaults

### 1.3 Create parameter module
- [x] **File**: `src/config/parameters/parameter.module.ts`
- **Estimated lines**: ~20
- **Spec reference**: parameter-store REQ-5
- **Description**: @Global() NestJS module registering ParameterService
- **Acceptance**: Module compiles, can be imported in AppModule

### 1.4 Create index barrel
- [x] **File**: `src/config/parameters/index.ts`
- **Estimated lines**: ~5
- **Description**: Re-export public API
- **Acceptance**: Clean imports from `src/config/parameters`

## Phase 2: Implementation

### 2.1 Create parameter store
- [x] **File**: `src/config/parameters/parameter.store.ts`
- **Estimated lines**: ~120
- **Spec reference**: parameter-store REQ-1, REQ-2, REQ-3, REQ-4
- **Description**: Redis + L1 Map cache implementation. Methods: get<T>(key), set(key, value), has(key), delete(key). TTL support, graceful fallback to defaults when Redis unavailable. Use existing RedisService
- **Acceptance**: Store reads/writes to Redis, falls back on connection error

### 2.2 Create parameter service
- [x] **File**: `src/config/parameters/parameter.service.ts`
- **Estimated lines**: ~60
- **Spec reference**: parameter-store REQ-1, REQ-2
- **Description**: Public API wrapping the store. OnModuleInit seeds Redis from registry defaults if missing. Exposes typed get/set/has/delete
- **Acceptance**: Service registered, seeding works, typed API functional

### 2.3 Register module in AppModule
- [x] **File**: `src/app/app.module.ts`
- **Estimated lines**: ~2 (1 import + 1 in imports array)
- **Description**: Import ParameterModule in AppModule
- **Acceptance**: App boots with ParameterModule loaded

## Phase 3: Testing

### 3.1 Unit tests for parameter store
- [x] **File**: `src/config/parameters/__tests__/parameter.store.spec.ts`
- **Estimated lines**: ~100
- **Spec reference**: parameter-store all scenarios
- **Description**: Mock RedisService, test get/set/has/delete, TTL behavior, fallback on error, L1 cache hits
- **Acceptance**: All store scenarios covered

### 3.2 Unit tests for parameter service
- [x] **File**: `src/config/parameters/__tests__/parameter.service.spec.ts`
- **Estimated lines**: ~80
- **Spec reference**: parameter-store REQ-1, REQ-2
- **Description**: Mock ParameterStore, test seeding, typed access, default fallback
- **Acceptance**: All service scenarios covered

### 3.3 Unit tests for registry
- [x] **File**: `src/config/parameters/__tests__/parameter-registry.spec.ts`
- **Estimated lines**: ~40
- **Spec reference**: parameter-registry REQ-1, REQ-2, REQ-3
- **Description**: Validate registry structure, type completeness, default values
- **Acceptance**: Registry validation passes

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| Total estimated lines | ~552 |
| New files | 8 |
| Modified files | 1 (app.module.ts) |
| PR risk | Medium |
| Chained PRs recommended | No (under 400 line budget for code, tests are additional) |
| Decision needed before apply | No |

### Recommendation
Single PR is feasible. Test files (~220 lines) are separate from implementation (~330 lines). Total is within 400-line budget when considering test files are expected to be larger.
