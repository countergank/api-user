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

- [ ] 1.1 `src/user/service/user.service.ts` — replace 11 `throw new *Error()` → `DomainError.fromKind(ErrorKind.*)` following the mapping table in design.md
- [ ] 1.2 `src/user/service/user.service.spec.ts` — update 10 `rejects.toBeInstanceOf(*Error)` → `rejects.toBeInstanceOf(DomainError)` with `.kind` assertion
- [ ] 1.3 `src/user/repository/user.repository.ts` — replace `throw new UserPopulateError(error)` → `DomainError.fromKind(ErrorKind.INTERNAL, { error })`

## Phase 2: Controller cleanup (User)

- [ ] 2.1 `src/user/controller/user.controller.ts` — remove try/catch in all 7 methods, remove legacy imports (`UserNotFoundError`, etc.), remove instanceof checks
- [ ] 2.2 `src/user/controller/user.controller.spec.ts` — update mock rejections to throw `DomainError.fromKind()` instead of legacy error constructors

## Phase 3: Service + Controller migration (App)

- [ ] 3.1 `src/app/service/app.service.ts` — replace `throw new AppVersionNotFoundError()` → `DomainError.fromKind(ErrorKind.APP_VERSION_NOT_FOUND)`
- [ ] 3.2 `src/app/controller/app.controller.ts` — remove try/catch in 2 methods, remove AppVersionNotFoundError import, remove instanceof check
- [ ] 3.3 `src/app/service/app.service.spec.ts` + `src/app/controller/app.controller.spec.ts` — update test expectations to DomainError

## Phase 4: Legacy cleanup

- [ ] 4.1 `src/user/errors/error-instances.error.ts` — DELETE entire file (all 6 error classes migrated)
- [ ] 4.2 `src/user/errors/error-instances.spec.ts` — DELETE (tests for removed classes)
- [ ] 4.3 `src/user/errors/errors.spec.ts` — DELETE (duplicate legacy error spec)
- [ ] 4.4 `src/app/errors/error-instances.error.ts` — remove `AppVersionNotFoundError` class and `AppErrors` entry
- [ ] 4.5 `src/app/errors/error-instances.spec.ts` — remove `AppVersionNotFoundError` test

## Verification

- [ ] 5.1 Run full test suite: `npx jest --forceExit --maxWorkers=50%`
- [ ] 5.2 Verify no remaining imports of removed legacy classes: `grep -rn "from.*user/errors\|from.*app/errors.*error-instances" src/ --include="*.ts" | grep -v "\.spec\.ts" | grep -v "error-instances\.error"` → empty
