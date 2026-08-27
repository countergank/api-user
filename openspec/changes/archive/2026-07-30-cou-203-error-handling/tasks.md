# Tasks: COU-203 Error Handling System — Phase 1 Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 380 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main / feature-branch-chain / size-exception / pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Create ErrorKind registry with hardcoded entries | PR 1 | `npm test src/common/errors/error-kind.spec.ts` | `curl -X GET http://localhost:3000/non-existent-endpoint` returns 404 | Remove error-kind.ts |
| 2 | Create DomainError class with fromKind() factory | PR 1 | `npm test src/common/errors/domain.error.spec.ts` | Service throws `DomainError.fromKind('UA-USR-001')`, controller catches, returns 404 | Remove domain.error.ts |
| 3 | Create ErrorResponseDto with static factories | PR 1 | `npm test src/common/dto/error-response.dto.spec.ts` | Filter catches DomainError and produces ErrorResponseDto with traceId | Remove error-response.dto.ts |
| 4 | Create TraceIdMiddleware for x-trace-id header | PR 1 | `npm test src/common/middleware/trace-id.middleware.spec.ts` | Request includes x-trace-id header, response contains same value | Remove trace-id.middleware.ts |
| 5 | Create AllExceptionsFilter for global error handling | PR 1 | `npm test src/common/filters/all-exceptions.filter.spec.ts` | Controller throws uncaught error, returns structured ErrorResponseDto | Remove all-exceptions.filter.ts |
| 6 | Create ValidationPipe with ErrorResponseDto errors | PR 1 | `npm test src/common/pipes/validation.pipe.spec.ts` | Request with invalid DTO body returns ErrorResponseDto validation errors | Remove validation.pipe.ts |
| 7 | Update AppModule with new providers and middleware | PR 1 | `npm run test:integration:app` | Application starts with new error handling stack | Revert app.module.ts changes |
| 8 | Remove old ErrorFilter registration from main.ts | PR 1 | `npm run test:integration:app` | Application starts cleanly without ErrorFilter | Restore main.ts filter registration |

## Phase 1: Infrastructure Foundation

- [x] 1.1 Create `src/common/errors/error-kind.ts` with ErrorKind registry
- [x] 1.2 Create `src/common/errors/domain.error.ts` with DomainError class and fromKind()
- [x] 1.3 Create `src/common/dto/error-response.dto.ts` with ErrorResponseDto shape and factories
- [x] 1.4 Create `src/common/middleware/trace-id.middleware.ts` with trace ID generation
- [x] 1.5 Create `src/common/filters/all-exceptions.filter.ts` with @Catch() handler
- [x] 1.6 Create `src/common/pipes/validation.pipe.ts` with custom ValidationPipe
- [x] 1.7 Update `src/app/app.module.ts` to register APP_FILTER and configure middleware
- [x] 1.8 Remove `app.useGlobalFilters(new ErrorFilter(...))` from `src/main.ts`

## Phase 2: Test Creation

- [x] 2.1 Create `src/common/errors/__tests__/error-kind.spec.ts` tests for ErrorKind
- [x] 2.2 Create `src/common/errors/__tests__/domain.error.spec.ts` tests for DomainError
- [x] 2.3 Create `src/common/dto/__tests__/error-response.dto.spec.ts` tests for ErrorResponseDto
- [x] 2.4 Create `src/common/middleware/__tests__/trace-id.middleware.spec.ts` tests for TraceIdMiddleware
- [x] 2.5 Create `src/common/filters/__tests__/all-exceptions.filter.spec.ts` tests for AllExceptionsFilter
- [x] 2.6 Create `src/common/pipes/__tests__/validation.pipe.spec.ts` tests for ValidationPipe

## Phase 3: Integration Testing

- [ ] 3.1 Write integration tests for error handling flow
- [ ] 3.2 Verify error responses match ErrorResponseDto specification
- [ ] 3.3 Test traceId consistency between middleware and filter
- [ ] 3.4 Test validation errors in ErrorResponseDto format
- [ ] 3.5 Update existing test assertions for new error response shape
- [ ] 3.6 Verify backward compatibility with ErrorBase hierarchy

## Phase 4: Documentation & Cleanup

- [ ] 4.1 Add JSDoc comments to new classes and methods
- [ ] 4.2 Update README/architecture documentation if needed
- [ ] 4.3 Remove temporary test files (if any created during development)
- [ ] 4.4 Audit imports and remove unused dependencies