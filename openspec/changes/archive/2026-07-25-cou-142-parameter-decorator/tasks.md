# Tasks: COU-142 — Parameter Decorator

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60-80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main / feature-branch-chain / size-exception / pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main/feature-branch-chain/size-exception/pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Create extract-parameter.helper.ts | PR 1 | Test helper with mocked service | Extract parameter logic with static service | src/config/parameters/decorators/extract-parameter.helper.ts |
| 2 | Create @Parameter decorator factory | PR 1 | Test decorator instantiation | Controller integration with @Parameter decorator | src/config/parameters/decorators/parameter.decorator.ts |
| 3 | Implement static holder in ParameterService | PR 1 | Verify static instance initialization | Verify ParameterService.instance is set | src/config/parameters/parameter.service.ts |
| 4 | Update ParameterModule to implement OnApplicationBootstrap | PR 1 | Test module lifecycle hook | Module bootstrapping test | src/config/parameters/parameter.module.ts |
| 5 | Export decorator from config index | PR 1 | Verify decorator importability | Module export test | src/config/parameters/index.ts |

## Phase 1: Foundation

- [x] 1.1 Add static `instance` and `ensureInitialized()` to ParameterService
- [x] 1.2 Implement `OnApplicationBootstrap` in ParameterService to set static holder
- [x] 1.3 Update import structure for ParameterService

## Phase 2: Implementation

- [x] 2.1 Create `src/config/parameters/decorators/extract-parameter.helper.ts`
- [x] 2.2 Implement ParameterService type inference and strict mode logic
- [x] 2.3 Create `src/config/parameters/decorators/parameter.decorator.ts` with exported Parameter constant
- [x] 2.4 Update ParameterService's OnApplicationBootstrap to set the static holder

## Phase 3: Wiring

- [x] 3.1 Update ParameterModule to implement OnApplicationBootstrap lifecycle hook
- [x] 3.2 Create `src/config/parameters/decorators/index.ts` for barrel export
- [x] 3.3 Export Parameter from `src/config/parameters/index.ts`
- [x] 3.4 Update ParameterRegistry to expose get method for type safety

## Phase 4: Testing

- [x] 4.1 Test extract-parameter.helper with mocked static service
- [x] 4.2 Test extract-parameter.helper with type inference
- [x] 4.3 Test Parameter decorator factory with strict mode
- [x] 4.4 Test integration with controller method parameters
- [x] 4.5 Test error scenarios (unknown keys, strict mode)
- [x] 4.6 Update parameter.service.spec.ts with bootstrap initialization tests
- [x] 4.7 Create extract-parameter.helper.spec.ts
- [x] 4.8 Create parameter.decorator.spec.ts
- [x] 4.9 Add tests for ParameterRegistry.findByKey in existing spec

## Phase 5: Verification

- [x] 5.1 Run existing parameter tests to ensure no regressions
- [x] 5.2 Verify decorator type inference works with Controller tests
- [x] 5.3 Test strict mode behavior (throw vs undefined)
- [x] 5.4 Verify static holder is set before decorator usage
- [x] 5.5 Test with real parameter values (integration if time permits)