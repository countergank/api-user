# Tasks: Migrate Remaining Modules to DomainError

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500+ |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Registry+i18n) → PR 2 (Auth) → PR 3 (Email) → PR 4 (Parameters) → PR 5 (Guards) → PR 6 (Leftovers + deletion) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add 20 new ErrorKind entries + 42 i18n keys (14×3 langs) | PR 1 | `npm run test:unit -- src/common/errors/error-kind.ts` | Run test with `Accept-Language: en/es/pt` headers | Rollback: revert error-kind.ts and i18n JSON files |
| 2 | Migrate 11 auth throws and remove AccountLockedException import | PR 2 | `npm run test:unit -- src/auth/auth.service.spec.ts` | Test register/login workflows | Rollback: restore legacy HTTP throws in auth.service.ts |
| 3 | Migrate 6 email template throws | PR 3 | `npm run test:unit -- src/email/service/email-template.service.spec.ts` | Test template CRUD operations | Rollback: restore ConflictException/NotFoundException/BadRequestException throws |
| 4 | Move 7 parameter validations from controller to service | PR 4 | `npm run test:unit -- src/config/parameters/parameter-admin.controller.spec.ts` | Test admin parameter update APIs | Rollback: restore controller validation logic and HttpException throws |
| 5 | Migrate 6 guard throws (convert last) | PR 5 | `npm run test:unit -- src/auth/guards/**/*.spec.ts` | Test protected endpoints with/without auth/roles | Rollback: restore UnauthorizedException/ForbiddenException in guards |
| 6 | Fix 4 leftovers + delete 13 legacy files + update defaults.decorator.ts | PR 6 | `npm run test:full` | Run all 64 suites, grep for HttpException in in-scope files | Rollback: restore legacy error classes and old Swagger DTOs |

## Phase 1: Registry + i18n Foundation

- [x] 1.1 Add 20 new ErrorKind entries to error-kind.ts with correct groups/codes/defaultMessage
- [x] 1.2 Write RED test for each new ErrorKind: test DomainError.fromKind('KIND') kind.kind === 'KIND'
- [x] 1.3 Implement each new ErrorKind in error-kind.ts (20 entries total)
- [x] 1.4 Add 14 new i18n keys to src/common/i18n/translations/en.json
- [x] 1.5 Add 14 new i18n keys to src/common/i18n/translations/es.json
- [x] 1.6 Add 14 new i18n keys to src/common/i18n/translations/pt.json
- [x] 1.7 Write RED test for i18n translation lookup with Accept-Language header
- [x] 1.8 Run AllExceptionsFilter tests for new kinds across all three languages

## Phase 2: Auth Migration

- [x] 2.1 Write RED test for auth.service.ts:62 expecting DomainError.fromKind('EMAIL_OR_USERNAME_EXISTS')
- [x] 2.2 Implement EMAIL_OR_USERNAME_EXISTS in auth.service.ts register method
- [x] 2.3 Write RED test for auth.service.ts:102 expecting DomainError.fromKind('INVALID_CREDENTIALS')
- [x] 2.4 Implement INVALID_CREDENTIALS in auth.service.ts login method
- [x] 2.5 Remove AccountLockedException import from auth.service.ts (after all throws migrated)
- [x] 2.6 Continue for all 11 auth throw sites (ACCOUNT_LOCKED, ACCOUNT_INACTIVE, EXPIRED_RESET_TOKEN, EXPIRED_VERIFICATION_TOKEN, EXPIRED_CONFIRMATION_TOKEN, NO_PENDING_EMAIL_CHANGE, INVALID_TOKEN, INVALID_REFRESH_TOKEN)

## Phase 3: Email Template Migration

- [x] 3.1 Write RED test for email-template.service.ts:61 expecting DomainError.fromKind('TEMPLATE_SLUG_ALREADY_EXISTS')
- [x] 3.2 Implement TEMPLATE_SLUG_ALREADY_EXISTS in email-template.service.ts create method
- [x] 3.3 Write RED test for email-template.service.ts:87 expecting DomainError.fromKind('TEMPLATE_NOT_FOUND')
- [x] 3.4 Implement TEMPLATE_NOT_FOUND in resolve method
- [x] 3.5 Continue for other 4 template NOT_FOUND sites and TEMPLATE_FILE_NOT_FOUND at line 195
- [x] 3.6 Remove ConflictException, NotFoundException, BadRequestException imports from email-template.service.ts

## Phase 4: Parameters Delegation

- [x] 4.1 Add ParameterService.update() method with DOMAIN_ERROR throws (PARAMETER_NOT_FOUND, PARAMETER_OVERRIDDEN, PARAMETER_VALUE_INVALID)
- [x] 4.2 Add ParameterService.validateAndCoerce() private method with DOMAIN_ERROR throws
- [x] 4.3 Write RED test for ParameterService.update() with invalid key expecting PARAMETER_NOT_FOUND
- [x] 4.4 Write RED test for ParameterService.update() with env-overridden key expecting PARAMETER_OVERRIDDEN
- [x] 4.5 Write RED test for ParameterService.validateAndCoerce() with invalid number expecting PARAMETER_VALUE_INVALID
- [x] 4.6 Implement validation logic in ParameterService methods
- [x] 4.7 Remove 7 validation checks from parameter-admin.controller.ts
- [x] 4.8 Update controller to delegate all validation to ParameterService.update()
- [x] 4.9 Remove try/catch blocks and HttpException imports from parameter-admin.controller.ts

## Phase 5: Guards Migration

- [x] 5.1 Write RED test for jwt-auth.guard.ts:17 expecting DomainError.fromKind('INVALID_TOKEN')
- [x] 5.2 Implement INVALID_TOKEN throw in jwt-auth.guard.ts
- [x] 5.3 Write RED test for roles.guard.ts:32 expecting DomainError.fromKind('FORBIDDEN')
- [x] 5.4 Implement FORBIDDEN throw in roles.guard.ts (3 sites)
- [x] 5.5 Write RED test for permissions.guard.ts:23 expecting DomainError.fromKind('FORBIDDEN')
- [x] 5.6 Implement FORBIDDEN throw in permissions.guard.ts (2 sites)
- [x] 5.7 Run guard integration tests with Accept-Language headers

## Phase 6: Leftovers + Legacy Deletion + Swagger

- [x] 6.1 Write RED test for user-profile.controller.ts:65 expecting DomainError.fromKind('CURRENT_PASSWORD_INCORRECT')
- [x] 6.2 Write RED test for user.service.ts:147 expecting DomainError.fromKind('EMAIL_ALREADY_EXISTS')
- [x] 6.3 Write RED test for user.repository.ts:137 expecting DomainError.fromKind('USER_NOT_FOUND')
- [x] 6.4 Write RED test for app.service.ts:44 expecting DomainError.fromKind('MICROSERVICE_UNAVAILABLE')
- [x] 6.5 Write RED test for src/common/api-docs/defaults.decorator.ts: verify ErrorResponseDto imports
- [x] 6.6 Verify error-base/ directory contents: grep for error-base imports across src/
- [x] 6.7 Verify error/ directory contents: grep for Error/GcommonErrors imports across src/
- [x] 6.8 Verify app.errors/ directory contents: grep for AppError imports across src/
- [x] 6.9 Verify user.errors/ directory contents: grep for UserErrors imports across src/
- [x] 6.10 Verify error-filter.ts import: grep for error-filter imports across src/
- [x] 6.11 Verify bad-request.error.ts import: grep for BadRequestError imports across src/
- [x] 6.12 Verify internal-server.error.ts import: grep for InternalServerError imports across src/
- [x] 6.13 Verify account-locked.exception.ts import: grep for AccountLockedException imports across src/
- [x] 6.14 Delete src/common/errors/error-base/ (4 files): error-base.ts, error-base.enums.ts, error-base.helpers.ts, error-base.types.ts
- [x] 6.15 Delete src/common/errors/error/ (2 files): error-instances.error.ts, error.dictionary.ts
- [x] 6.16 Delete src/app/errors/ (2 files): error-instances.error.ts, error.dictionary.ts
- [x] 6.17 Delete src/user/errors/ (1 file): error.dictionary.ts
- [x] 6.18 Delete src/common/errors/error-filter.ts
- [x] 6.19 Delete src/common/errors/bad-request.error.ts
- [x] 6.20 Delete src/common/errors/internal-server.error.ts
- [x] 6.21 Delete src/common/errors/account-locked.exception.ts
- [x] 6.22 Update src/common/api-docs/defaults.decorator.ts: replace legacy DTO imports with ErrorResponseDto
- [x] 6.23 Run full test suite (npm test) to verify all 64 suites / 569 tests pass
- [x] 6.24 Final grep verification: zero HttpException imports across all in-scope files, zero legacy error class imports
- [x] 6.25 Update any remaining test assertions that reference legacy error classes to use DomainError

## Tasks Created

**Change**: cou-209-migrate-remaining-modules-to-domainerror
**Location**: openspec/changes/cou-209-migrate-remaining-modules-to-domainerror/tasks.md

### Breakdown
| Phase | Tasks | Focus |
|-------|-------|-------|
| Phase 1 | 8 | Registry + i18n Foundation |
| Phase 2 | 11 | Auth Migration |
| Phase 3 | 7 | Email Template Migration |
| Phase 4 | 9 | Parameters Delegation |
| Phase 5 | 7 | Guards Migration |
| Phase 6 | 29 | Leftovers + Legacy Deletion + Swagger |
| Total | 62 | |

### Implementation Order
Work proceeds in 6 phases following dependency order: Registry+i18n (foundation) → Auth → Email → Parameters → Guards → Leftovers+Deletion+Swagger. Each phase builds on the previous foundation and ensures the ErrorKind registry is complete before migration starts.

### Review Workload Forecast
- Estimated changed lines: 500+
- 400-line budget risk: High
- Chained PRs recommended: Yes
- Delivery strategy: ask-on-risk
- Decision needed before apply: Yes
- Suggested work-unit PR split: PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 (chained to tracker branch feat/cou-203-error-handling)

### Next Step
Ready for implementation (sdd-apply) after user chooses chain strategy for PR splitting.
