# Proposal: Migrate Remaining Modules to DomainError

## Intent

Complete the unified error handling migration (COU-203) by converting all remaining raw `HttpException` throws and legacy error patterns to `DomainError.fromKind()`. The User and App modules are already migrated (COU-208). This change ensures the `AllExceptionsFilter` translates every error via i18n respecting `Accept-Language`, with consistent domain error codes across the entire API.

## Scope

### In Scope
- **Auth service** (`auth/auth.service.ts`): 11 raw HTTP throws → `DomainError` kinds; remove `AccountLockedException`
- **Email template service** (`email/service/email-template.service.ts`): 6 raw HTTP throws → `DomainError` kinds
- **Parameters admin controller** (`config/parameters/parameter-admin.controller.ts`): 7 raw HTTP throws moved to `parameter.service.ts` → `DomainError` kinds
- **Guards** (`auth/guards/jwt-auth.guard.ts`, `roles.guard.ts`, `permissions.guard.ts`): 6 `HttpException` throws → `DomainError` kinds
- **Leftover one-liners** in user profile controller, user service, user repository, app service
- **Legacy infra deletion**: remove `common/errors/error-base/`, `common/errors/error/`, `app/errors/`, `user/errors/`, `common/errors/error-filter.ts`, `common/errors/bad-request.error.ts`, `common/errors/internal-server.error.ts`, `common/errors/account-locked.exception.ts`; re-point `defaults.decorator.ts` Swagger types to `ErrorResponseDto`
- **Translation sync**: add missing i18n keys for new `ErrorKind` values; align kind naming with existing keys

### Out of Scope
- `ValidationPipe` emitting `HttpException` with `UA-COM-005` by design — keep as documented
- Bootstrap/plain `Error` throws in `parameter.service.ts` / registry / store — document as out of scope (lower priority)
- Adding new i18n languages beyond existing en/es/pt
- Changing `AllExceptionsFilter` or i18n infrastructure

## Capabilities

### New Capabilities
- `error-kind-registry`: Extended `ErrorKind` enum with 18 new kinds for auth, email, params, guards, and microservice errors
- `i18n-error-translations`: New translation keys in en/es/pt for all new error kinds

### Modified Capabilities
- `unified-error-handling`: Requirements extended to cover all modules (was User/App only)
- `api-error-responses`: Swagger response types now reference `ErrorResponseDto` exclusively

## Approach

1. **Extend `ErrorKind` enum** in `common/errors/domain-error.ts` with 18 new kinds matching i18n key names
2. **Migrate each module** in priority order: Auth → Email → Parameters → Guards → Leftovers
3. **Replace throws**: `throw new BadRequestException('CODE')` → `throw DomainError.fromKind(ErrorKind.CODE, { context })`
4. **Move controller logic** in `parameter-admin.controller.ts` to `parameter.service.ts` for proper layering
5. **Delete legacy infra** after all consumers migrated
6. **Sync translations**: add missing `errors.*` keys in `src/i18n/en.json`, `es.json`, `pt.json`
7. **Update `defaults.decorator.ts`** to use `ErrorResponseDto` for Swagger

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/auth/auth.service.ts` | Modified | 11 throws → DomainError; remove AccountLockedException import |
| `src/email/service/email-template.service.ts` | Modified | 6 throws → DomainError |
| `src/config/parameters/parameter-admin.controller.ts` | Modified | Move throws to service; 7 throws → DomainError |
| `src/config/parameters/parameter.service.ts` | Modified | Receive moved logic; add DomainError throws |
| `src/auth/guards/jwt-auth.guard.ts` | Modified | 1 throw → DomainError |
| `src/auth/guards/roles.guard.ts` | Modified | 3 throws → DomainError |
| `src/auth/guards/permissions.guard.ts` | Modified | 2 throws → DomainError |
| `src/user/controller/user-profile.controller.ts` | Modified | 1 throw → DomainError |
| `src/user/service/user.service.ts` | Modified | 1 throw → DomainError |
| `src/user/repository/user.repository.ts` | Modified | Plain Error → DomainError |
| `src/app/service/app.service.ts` | Modified | Plain Error → DomainError |
| `src/common/errors/domain-error.ts` | Modified | Extend ErrorKind enum with 18 new kinds |
| `src/common/errors/error-base/` | Removed | Legacy error base classes |
| `src/common/errors/error/` | Removed | GenericError, CommonErrors, error.dictionary.ts |
| `src/app/errors/` | Removed | Dead error chain |
| `src/user/errors/` | Removed | Zero-consumer error dictionary |
| `src/common/errors/error-filter.ts` | Removed | Unregistered filter |
| `src/common/errors/bad-request.error.ts` | Removed | Swagger DTO (replaced by ErrorResponseDto) |
| `src/common/errors/internal-server.error.ts` | Removed | Swagger DTO (replaced by ErrorResponseDto) |
| `src/common/errors/account-locked.exception.ts` | Removed | Legacy exception (after auth migration) |
| `src/common/decorators/defaults.decorator.ts` | Modified | Re-point Swagger types to ErrorResponseDto |
| `src/i18n/en.json, es.json, pt.json` | Modified | Add 18 new error translation keys |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Guard conversion breaks auth flow | Medium | Convert guards last; test each guard independently; keep HttpException fallback during transition |
| Missing i18n keys cause English fallback | High | Add all keys in single PR; validate with `Accept-Language` header tests |
| Parameter service bootstrap Errors unhandled | Low | Document as known gap; create follow-up ticket |
| Swagger docs break during migration | Low | Update `defaults.decorator.ts` atomically with last module migration |
| Chained PR #384 conflicts | Medium | Rebase onto `feat/cou-203-error-handling` before each work unit |

## Rollback Plan

1. Revert `src/common/errors/domain-error.ts` `ErrorKind` enum to pre-migration state
2. Restore deleted legacy error files from git history
3. Revert `defaults.decorator.ts` Swagger types to previous imports
4. Revert i18n translation files to pre-migration state
5. All changes are on feature branch `feat/cou-203-error-handling` — no develop merge until verified

## Dependencies

- COU-208 (User/App migration) — **Done**
- `DomainError.fromKind()` and `AllExceptionsFilter` infrastructure — **Exists**
- i18n infrastructure with en/es/pt — **Exists**

## Success Criteria

- [ ] Zero raw `HttpException` throws remain in in-scope files (grep verification)
- [ ] Zero imports of legacy error classes (`AccountLockedException`, `GenericError`, etc.)
- [ ] All 18 new `ErrorKind` values have translations in en/es/pt
- [ ] `AllExceptionsFilter` returns localized messages for all new kinds (manual test with `Accept-Language`)
- [ ] Swagger docs show `ErrorResponseDto` for all endpoints (no legacy DTOs)
- [ ] Existing tests pass; new unit tests for each migrated module's error paths
- [ ] No regression in auth, email, parameters, guards workflows (E2E smoke test)