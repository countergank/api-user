# Tasks: Migrate controllers and services to DomainError

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~200 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

## Phase 1: Service migration (User)

- [x] 1.1 `src/user/service/user.service.ts` — replace 11 `throw new *Error()` → `DomainError.fromKind(ErrorKind.*)` following the mapping table in design.md
- [x] 1.2 `src/user/service/user.service.spec.ts` — update 10 `rejects.toBeInstanceOf(*Error)` → `rejects.toBeInstanceOf(DomainError)` with `.kind` assertion
- [x] 1.3 `src/user/repository/user.repository.ts` — replace `throw new UserPopulateError(error)` → `DomainError.fromKind(ErrorKind.INTERNAL, { error })` — **RESOLVED**: `await` added at line 26; catch now reachable, test B GREEN

## Phase 2: Controller cleanup (User)

- [x] 2.1 `src/user/controller/user.controller.ts` — remove try/catch in all 7 methods, remove legacy imports (`UserNotFoundError`, etc.), remove instanceof checks
- [x] 2.2 `src/user/controller/user.controller.spec.ts` — update mock rejections to throw `DomainError.fromKind()` instead of legacy error constructors

## Phase 3: Service + Controller migration (App)

- [x] 3.1 `src/app/service/app.service.ts` — replace `throw new AppVersionNotFoundError()` → `DomainError.fromKind(ErrorKind.APP_VERSION_NOT_FOUND)`
- [x] 3.2 `src/app/controller/app.controller.ts` — remove try/catch in 2 methods, remove AppVersionNotFoundError import, remove instanceof check
- [x] 3.3 `src/app/service/app.service.spec.ts` + `src/app/controller/app.controller.spec.ts` — update test expectations to DomainError

## Phase 4: Legacy cleanup

- [x] 4.1 `src/user/errors/error-instances.error.ts` — DELETE entire file (all 6 error classes migrated)
- [x] 4.2 `src/user/errors/error-instances.spec.ts` — DELETE (tests for removed classes)
- [x] 4.3 `src/user/errors/errors.spec.ts` — DELETE (duplicate legacy error spec)
- [x] 4.4 `src/app/errors/error-instances.error.ts` — remove `AppVersionNotFoundError` class and `AppErrors` entry
- [x] 4.5 `src/app/errors/error-instances.spec.ts` — remove `AppVersionNotFoundError` test

## Verification

- [x] 5.1 Run full test suite: `npx jest --forceExit --maxWorkers=50%` (post-remediation: 64 suites / 569 tests, exit 0)
- [x] 5.2 Verify no remaining imports of removed legacy classes: `grep -rn "from.*user/errors\|from.*app/errors.*error-instances" src/ --include="*.ts" | grep -v "\.spec\.ts" | grep -v "error-instances\.error"` → empty

## Remediation note (2026-07-31, sdd-apply remediation batch)

Added missing spec-coverage tests per failed verification (verify-report #1350):

- AllExceptionsFilter i18n branch: 5 tests (translate es/en, fallback to default message, HttpException i18n + fallback) in `src/common/filters/__tests__/all-exceptions.filter.spec.ts`
- `.kind` assertions for main DomainError cases: `user.service.spec.ts` (ENTITY_EMAIL_ALREADY_EXISTS, ENTITY_NAME_ALREADY_EXISTS, USER_NOT_FOUND ×3 paths) and `app.service.spec.ts` (APP_VERSION_NOT_FOUND)
- Repository INTERNAL test in `user.repository.spec.ts` initially FAILED, exposing a production defect: `populateUsers()` returned `this.createWithRole(...)` without `await`, so async rejections bypassed the try/catch and the `DomainError.fromKind('INTERNAL', ...)` wrap (line 38) was unreachable.

**Production fix (authorized, 1 line)**: `user.repository.ts:26` → `return await this.createWithRole({ ... })`. Catch now reachable; test B GREEN.

**Final results**: targeted 4 suites → 75/75 pass; full `npm run test:unit` → 64 suites / 569 tests, exit 0. Ready for re-verify.
