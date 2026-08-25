# Tasks: Parameter Admin Endpoint (COU-143)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400-450 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 (Phase 1+2) → PR #2 (Phase 3) → PR #3 (Phase 4+5) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add getAll() to ParameterRegistry and getByKeys() to ParameterStore | PR #1 | "npm test src/config/parameters/parameter-registry.spec.ts" | "Redis latency < 10ms for 50 param ops" | Parameter registry logic + store batch methods |
| 2 | Add getAll() and getByGroup() to ParameterService, add ParameterEntry type | PR #1 | "npm test src/config/parameters/parameter.service.spec.ts" | "Service response time < 50ms for 50 param ops" | Service aggregation layer |
| 3 | Update ParameterModule with RedisModule import, add ParameterStore and ParameterService to providers/exports | PR #1 | "npm test" | "Module bootstrap < 500ms" | Core dependency module |
| 4 | Create ParameterAdminModule with new module class | PR #2 | "npm test src/config/parameters/parameter-admin.module.spec.ts" | "Module import < 100ms" | New admin module container |
| 5 | Update app.module.ts to import ParameterAdminModule | PR #2 | "npm test" | "Full app bootstrap < 800ms" | App module wiring |
| 6 | Create UpdateParameterDto and ParameterResponseDto | PR #2 | "npm test src/config/parameters/dto/*.spec.ts" | "DTO validation < 5ms" | Data transfer objects |
| 7 | Create ParameterAdminController with 3 endpoints | PR #3 | "npm test src/config/parameters/__tests__/parameter-admin.controller.spec.ts" | "Full admin API < 200ms" | Controller with all 3 endpoints |
| 8 | Update parameter.service.spec.ts to test new methods | PR #3 | "npm test src/config/parameters/__tests__/parameter.service.spec.ts -f getAll" | "Service tests < 30ms" | Service unit tests |
| 9 | Run full test suite and verification | PR #4 | "npm test -- --maxWorkers=4" | "All tests < 2 minutes" | Full test validation |

## Phase 1: Foundation (Registry + Service extensions)

- [ ] 1.1 Add `getAll()` method to ParameterRegistry (returns all ParameterDefinitions)
- [ ] 1.2 Add `getByKeys(keys: string[])` to ParameterStore (batch get with individual key fallback)
- [ ] 1.3 Add `getAll()` and `getByGroup(group)` to ParameterService (returns ParameterEntry[])
- [ ] 1.4 Add `ParameterEntry` interface to `parameter.types.ts`

## Phase 2: Module Wiring

- [ ] 2.1 Update `ParameterModule` to import RedisModule (explicit import), add ParameterStore and ParameterService to providers + exports
- [ ] 2.2 Create `ParameterAdminModule` at `src/config/parameters/parameter-admin.module.ts`
- [ ] 2.3 Update `app.module.ts` to import ParameterAdminModule
- [ ] 2.4 Update `src/config/parameters/index.ts` to export new classes

## Phase 3: Controller + DTOs

- [ ] 3.1 Create `UpdateParameterDto` at `src/config/parameters/dto/update-parameter.dto.ts`
- [ ] 3.2 Create `ParameterAdminController` at `src/config/parameters/parameter-admin.controller.ts` with 3 endpoints:
  - GET /admin/parameters (findAll)
  - GET /admin/parameters/:group (findByGroup)
  - PUT /admin/parameters/:key (update)
- [ ] 3.3 Implement value coercion logic (string → number/boolean based on parameter type)
- [ ] 3.4 Add error handling (404 for unknown keys, 409 for env-overridden, 422 for validation)

## Phase 4: Tests

- [ ] 4.1 Unit tests for ParameterRegistry.getAll() (if not already covered)
- [ ] 4.2 Unit tests for ParameterStore.getByKeys()
- [ ] 4.3 Unit tests for ParameterService.getAll() and getByGroup()
- [ ] 4.4 Integration tests for ParameterAdminController (using Test.createTestingModule)

## Phase 5: Verification

- [ ] 5.1 Run test suite, verify all tests pass
- [ ] 5.2 Run linter (npx biome lint --diagnostic-level=error ./src)
- [ ] 5.3 Run type checker