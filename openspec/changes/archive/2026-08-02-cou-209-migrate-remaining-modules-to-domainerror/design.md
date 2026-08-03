# Design: Migrate Remaining Modules to DomainError

## Technical Approach

Extend the `ErrorKind` registry with 20 new entries covering auth, email template, parameters, guards, and microservice errors. Migrate 34 throw sites across 9 files to `DomainError.fromKind(ErrorKind.*)`, move parameter controller validation logic into the service layer, delete 13 legacy error files, and add 14 i18n keys × 3 languages. Work proceeds in 6 independently-verifiable units: registry+i18n → auth → email → parameters → guards → leftovers+deletion+swagger.

## Architecture Decisions

### Decision: ErrorKind registry extension (20 new entries)

| Choice | Add all 20 entries to `error-kind.ts` as `as const` object, preserving existing 9 entries |
|--------|-------------------------------------------------------------------------------------------|
| Alternatives | Separate file per domain; enum instead of object |
| Rationale | Single source of truth; `as const` gives exact string literal types for `ErrorKindName`; no breaking changes to `DomainError.fromKind` typing. Existing groups (COM, USR, APP) reused; new group `AUTH` for auth-specific errors, `EML` for email template, `PAR` for parameters, `SEC` for security/guards. |

### Decision: ErrorKind code assignment (collision-free)

| Kind | Group | Code | Status | defaultMessage | Notes |
|------|-------|------|--------|----------------|-------|
| EMAIL_OR_USERNAME_EXISTS | AUTH | UA-AUTH-001 | 409 | Email or username already exists | |
| INVALID_CREDENTIALS | AUTH | UA-AUTH-002 | 401 | Invalid credentials | |
| ACCOUNT_LOCKED | AUTH | UA-AUTH-003 | 423 | Account is temporarily locked due to too many failed login attempts. Please try again later or contact support. | Locked account (RFC 6585) |
| ACCOUNT_INACTIVE | AUTH | UA-AUTH-004 | 401 | User account is inactive | |
| EXPIRED_RESET_TOKEN | AUTH | UA-AUTH-005 | 400 | Invalid or expired reset token | |
| EXPIRED_VERIFICATION_TOKEN | AUTH | UA-AUTH-006 | 400 | Invalid or expired verification token | |
| EXPIRED_CONFIRMATION_TOKEN | AUTH | UA-AUTH-007 | 400 | Invalid or expired confirmation token | |
| NO_PENDING_EMAIL_CHANGE | AUTH | UA-AUTH-008 | 400 | No pending email change found | |
| INVALID_TOKEN | SEC | UA-SEC-001 | 401 | Invalid or expired token | Guards + refreshToken |
| INVALID_REFRESH_TOKEN | AUTH | UA-AUTH-009 | 401 | Invalid refresh token | |
| CURRENT_PASSWORD_INCORRECT | USR | UA-USR-003 | 400 | Current password is incorrect | |
| EMAIL_ALREADY_EXISTS | USR | UA-USR-004 | 409 | Email is already registered | user.service requestEmailChange |
| FORBIDDEN | SEC | UA-SEC-002 | 403 | Access denied | Roles/permissions guards |
| TEMPLATE_SLUG_ALREADY_EXISTS | EML | UA-EML-001 | 409 | Template with this slug already exists | |
| TEMPLATE_NOT_FOUND | EML | UA-EML-002 | 404 | Template not found | |
| TEMPLATE_FILE_NOT_FOUND | EML | UA-EML-003 | 400 | Default template file not found | |
| PARAMETER_NOT_FOUND | PAR | UA-PAR-001 | 404 | Parameter not found | |
| PARAMETER_OVERRIDDEN | PAR | UA-PAR-002 | 409 | Parameter is overridden by environment | |
| PARAMETER_VALUE_INVALID | PAR | UA-PAR-003 | 422 | Invalid value for parameter | |
| MICROSERVICE_UNAVAILABLE | APP | UA-APP-003 | 503 | Microservice unavailable | |

**Collision check**: Existing codes UA-COM-001..005, UA-APP-001..002, UA-USR-001..002. New codes use unused groups (AUTH, SEC, EML, PAR) and next available sequence per group — zero collisions.

### Decision: Guard conversion timing

| Choice | Convert guards **last** (work unit 5), after all services are migrated |
|--------|------------------------------------------------------------------------|
| Rationale | Guards sit at the request boundary; converting them early risks auth flow breakage before downstream services handle the new error kinds. The `AllExceptionsFilter` already handles `DomainError` from any source, so order of migration doesn't affect filter behavior — only risk profile. |

### Decision: Parameter controller delegation

| Choice | Move all 7 validation checks from `parameter-admin.controller.ts` into new methods on `ParameterService`; controller becomes pure delegation (`return this.parameterService.update(key, dto)`) |
|--------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Rationale | Aligns with COU-208 pattern (controllers delegate, services throw `DomainError`). Eliminates `try/catch`, `HttpException` imports, and controller-level error logic. Service already has `registry` and `store` dependencies for validation. |

### Decision: Legacy deletion dependency order

| Choice | Delete legacy files **only after** grep confirms zero imports across `src/` (excluding test files). Order: (1) error-base/, error/, app/errors/, user/errors/ (2) error-filter.ts, bad-request.error.ts, internal-server.error.ts, account-locked.exception.ts (3) update `defaults.decorator.ts` to `ErrorResponseDto` in same commit |
|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Rationale | Prevents runtime import errors. `defaults.decorator.ts` references `BadRequestError`/`InternalServerError` — must be updated atomically with their removal. |

## Migration Mapping Tables

### Auth Service (11 sites)

| File:Line | Current Throw | Current Message | New ErrorKind |
|-----------|---------------|-----------------|---------------|
| auth.service.ts:62 | `BadRequestException` | `EMAIL_OR_USERNAME_EXISTS` | `EMAIL_OR_USERNAME_EXISTS` |
| auth.service.ts:102 | `UnauthorizedException` | `INVALID_CREDENTIALS` | `INVALID_CREDENTIALS` |
| auth.service.ts:107 | `AccountLockedException` | (class message) | `ACCOUNT_LOCKED` |
| auth.service.ts:125 | `UnauthorizedException` | `INVALID_CREDENTIALS` | `INVALID_CREDENTIALS` |
| auth.service.ts:137 | `UnauthorizedException` | `ACCOUNT_INACTIVE` | `ACCOUNT_INACTIVE` |
| auth.service.ts:192 | `BadRequestException` | `EXPIRED_RESET_TOKEN` | `EXPIRED_RESET_TOKEN` |
| auth.service.ts:222 | `BadRequestException` | `EXPIRED_VERIFICATION_TOKEN` | `EXPIRED_VERIFICATION_TOKEN` |
| auth.service.ts:242 | `BadRequestException` | `EXPIRED_CONFIRMATION_TOKEN` | `EXPIRED_CONFIRMATION_TOKEN` |
| auth.service.ts:247 | `BadRequestException` | `NO_PENDING_EMAIL_CHANGE` | `NO_PENDING_EMAIL_CHANGE` |
| auth.service.ts:304 | `UnauthorizedException` | `INVALID_TOKEN` | `INVALID_TOKEN` |
| auth.service.ts:308 | `UnauthorizedException` | `INVALID_REFRESH_TOKEN` | `INVALID_REFRESH_TOKEN` |

**Note**: Remove `AccountLockedException` import after line 107 migration.

### Email Template Service (6 sites)

| File:Line | Current Throw | Current Message | New ErrorKind |
|-----------|---------------|-----------------|---------------|
| email-template.service.ts:61 | `ConflictException` | `Template with slug "${dto.slug}" already exists` | `TEMPLATE_SLUG_ALREADY_EXISTS` |
| email-template.service.ts:87 | `NotFoundException` | `Template "${slug}" not found` | `TEMPLATE_NOT_FOUND` |
| email-template.service.ts:95 | `NotFoundException` | `Template "${slug}" not found` | `TEMPLATE_NOT_FOUND` |
| email-template.service.ts:103 | `NotFoundException` | `Template "${slug}" not found` | `TEMPLATE_NOT_FOUND` |
| email-template.service.ts:118 | `NotFoundException` | `Template "${slug}" not found in database and no default exists` | `TEMPLATE_NOT_FOUND` |
| email-template.service.ts:195 | `BadRequestException` | `Default template file "${filename}" not found` | `TEMPLATE_FILE_NOT_FOUND` |

### Parameters Layer (7 controller → service)

| Controller Method | Controller Validation (move to service) | New Service Method | ErrorKind |
|-------------------|----------------------------------------|-------------------|-----------|
| `update()` L52-54 | `!this.parameterService.has(key)` | `ParameterService.update(key, value)` | `PARAMETER_NOT_FOUND` |
| `update()` L58-63 | `currentEntry?.isOverridden` | `ParameterService.update()` | `PARAMETER_OVERRIDDEN` |
| `coerceValue()` L82-84 | `!this.registry.findByKey(key)` | (internal) | `PARAMETER_NOT_FOUND` |
| `coerceValue()` L89-92 | `Number.isNaN(n)` | (internal) | `PARAMETER_VALUE_INVALID` |
| `coerceValue()` L94-97 | `n <= 0 && key === 'THROTTLE_LIMIT'` | (internal) | `PARAMETER_VALUE_INVALID` |
| `coerceValue()` L103-106 | `!['true','false','1','0'].includes(lower)` | (internal) | `PARAMETER_VALUE_INVALID` |
| `update()` L74-76 | `!entry` after set | `ParameterService.update()` | `PARAMETER_NOT_FOUND` (defensive) |

**New `ParameterService` methods**:
- `async update(key: string, value: string): Promise<ParameterEntry>` — encapsulates all validation, throws `DomainError.fromKind` for the three `PARAMETER_*` kinds
- `private validateAndCoerce(key: string, raw: string): string | number | boolean` — extracted from controller's `coerceValue()`

Controller `update()` becomes:
```ts
async update(@Param('key') key: string, @Body() dto: UpdateParameterDto): Promise<ParameterEntry> {
  return this.parameterService.update(key, dto.value);
}
```

### Guards (6 sites)

| File:Line | Current Throw | Current Message | New ErrorKind |
|-----------|---------------|-----------------|---------------|
| jwt-auth.guard.ts:17 | `UnauthorizedException` | `INVALID_TOKEN` | `INVALID_TOKEN` |
| roles.guard.ts:32 | `ForbiddenException` | `User not authenticated` | `FORBIDDEN` |
| roles.guard.ts:38 | `ForbiddenException` | `User has no role assigned` | `FORBIDDEN` |
| roles.guard.ts:44-46 | `ForbiddenException` | `Access denied. Required roles: ...` | `FORBIDDEN` |
| permissions.guard.ts:23 | `ForbiddenException` | `User not authenticated` | `FORBIDDEN` |
| permissions.guard.ts:43 | `ForbiddenException` | `Insufficient permissions` | `FORBIDDEN` |

**Note**: Guard messages differ from `ErrorKind.defaultMessage` ("Access denied"). The filter translates via i18n key `errors.FORBIDDEN` → "Access denied" in all languages. Guard-specific context (required roles) is lost — acceptable per spec (static i18n keys, no interpolation).

### Leftovers (4 sites)

| File:Line | Current Throw | Current Message | New ErrorKind |
|-----------|---------------|-----------------|---------------|
| user-profile.controller.ts:65 | `BadRequestException` | `CURRENT_PASSWORD_INCORRECT` | `CURRENT_PASSWORD_INCORRECT` |
| user.service.ts:147 | `ConflictException` | `EMAIL_ALREADY_EXISTS` | `EMAIL_ALREADY_EXISTS` |
| user.repository.ts:137 | `new Error()` | `User ${id} not found` | `USER_NOT_FOUND` (existing) |
| app.service.ts:44 | `new Error()` | `ExampleMicroservice is disabled or not available.` | `MICROSERVICE_UNAVAILABLE` |

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REQUEST FLOW (after migration)                      │
└─────────────────────────────────────────────────────────────────────────────┘

Controller (pure delegation) ──→ Service/Guard throws DomainError
                                                              │
                                              AllExceptionsFilter (global)
                                                              │
                                              ┌───────────────┴───────────────┐
                                              ▼                               ▼
                                    I18nService.translate()          ErrorResponseDto.fromDomainError()
                                    key: `errors.${kind.kind}`              │
                                              │                               ▼
                                              ▼                    ┌───────────────────────┐
                                    Fallback to                     │  HTTP Response        │
                                    kind.defaultMessage             │  {statusCode, code,   │
                                              │                    │   message, traceId,   │
                                              └───────────────────►│   timestamp}          │
                                                                   └───────────────────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/common/errors/error-kind.ts` | Modify | Add 20 new `ErrorKind` entries (see table above) |
| `src/common/i18n/translations/en.json` | Modify | Add 14 new `errors.*` keys (see i18n spec) |
| `src/common/i18n/translations/es.json` | Modify | Add 14 new `errors.*` keys (see i18n spec) |
| `src/common/i18n/translations/pt.json` | Modify | Add 14 new `errors.*` keys (see i18n spec) |
| `src/auth/auth.service.ts` | Modify | 11 throws → `DomainError.fromKind`; remove `AccountLockedException` import |
| `src/email/service/email-template.service.ts` | Modify | 6 throws → `DomainError.fromKind`; remove `ConflictException`, `NotFoundException`, `BadRequestException` imports |
| `src/config/parameters/parameter.service.ts` | Modify | Add `update()` + `validateAndCoerce()` methods with 3 `DomainError` throws |
| `src/config/parameters/parameter-admin.controller.ts` | Modify | Remove 7 validations, `try/catch`, `HttpException` imports; delegate to service |
| `src/auth/guards/jwt-auth.guard.ts` | Modify | 1 throw → `DomainError.fromKind('INVALID_TOKEN')` |
| `src/auth/guards/roles.guard.ts` | Modify | 3 throws → `DomainError.fromKind('FORBIDDEN')` |
| `src/auth/guards/permissions.guard.ts` | Modify | 2 throws → `DomainError.fromKind('FORBIDDEN')` |
| `src/user/controller/user-profile.controller.ts` | Modify | 1 throw → `DomainError.fromKind('CURRENT_PASSWORD_INCORRECT')` |
| `src/user/service/user.service.ts` | Modify | 1 throw (`ConflictException`) → `DomainError.fromKind('EMAIL_ALREADY_EXISTS')` |
| `src/user/repository/user.repository.ts` | Modify | Line 137: `throw new Error()` → `DomainError.fromKind('USER_NOT_FOUND')` |
| `src/app/service/app.service.ts` | Modify | Line 44: `throw new Error()` → `DomainError.fromKind('MICROSERVICE_UNAVAILABLE')` |
| `src/common/api-docs/defaults.decorator.ts` | Modify | Replace `BadRequestError`/`InternalServerError` imports with `ErrorResponseDto` |
| `src/common/errors/error-base/` | Delete | Directory (4 files) — legacy base classes |
| `src/common/errors/error/` | Delete | Directory (2 files) — `GenericError`, `CommonErrors`, `error.dictionary.ts` |
| `src/app/errors/` | Delete | Directory (2 files) — dead error chain |
| `src/user/errors/` | Delete | Directory (1 file) — zero consumers since COU-208 |
| `src/common/errors/error-filter.ts` | Delete | Unregistered legacy filter |
| `src/common/errors/bad-request.error.ts` | Delete | Legacy Swagger DTO (replaced by `ErrorResponseDto`) |
| `src/common/errors/internal-server.error.ts` | Delete | Legacy Swagger DTO (replaced by `ErrorResponseDto`) |
| `src/common/errors/account-locked.exception.ts` | Delete | Legacy exception (replaced by `ErrorKind.ACCOUNT_LOCKED`) |

## Interfaces / Contracts

### ParameterService new methods

```typescript
// src/config/parameters/parameter.service.ts

async update(key: string, value: string): Promise<ParameterEntry> {
  // 1. Existence
  if (!this.has(key)) {
    throw DomainError.fromKind('PARAMETER_NOT_FOUND');
  }

  // 2. Env override check
  const allEntries = await this.getAll();
  const currentEntry = allEntries.find((e) => e.key === key);
  if (currentEntry?.isOverridden) {
    throw DomainError.fromKind('PARAMETER_OVERRIDDEN');
  }

  // 3. Coerce & validate
  const coerced = this.validateAndCoerce(key, value);

  // 4. Set
  await this.set(key, coerced);

  // 5. Return updated
  const updatedEntries = await this.getAll();
  const entry = updatedEntries.find((e) => e.key === key);
  if (!entry) {
    throw DomainError.fromKind('PARAMETER_NOT_FOUND'); // defensive
  }
  return entry;
}

private validateAndCoerce(key: string, raw: string): string | number | boolean {
  const def = this.registry.findByKey(key);
  if (!def) {
    throw DomainError.fromKind('PARAMETER_NOT_FOUND');
  }

  switch (def.type) {
    case 'number': {
      const n = Number(raw);
      if (Number.isNaN(n)) {
        throw DomainError.fromKind('PARAMETER_VALUE_INVALID');
      }
      if (n <= 0 && key === 'THROTTLE_LIMIT') {
        throw DomainError.fromKind('PARAMETER_VALUE_INVALID');
      }
      return n;
    }
    case 'boolean': {
      const lower = raw.toLowerCase();
      if (!['true', 'false', '1', '0'].includes(lower)) {
        throw DomainError.fromKind('PARAMETER_VALUE_INVALID');
      }
      return ['true', '1'].includes(lower);
    }
    default:
      return raw;
  }
}
```

### defaults.decorator.ts Swagger re-point

```typescript
// src/common/api-docs/defaults.decorator.ts
import { ErrorResponseDto } from '../dto/error-response.dto';
// REMOVE: import { BadRequestError } from '../errors/bad-request.error';
// REMOVE: import { InternalServerError } from '../errors/internal-server.error';
// REMOVE: import { statusKey } from '../errors/error-base/error-base.helpers';

export const applyDocsDecorators = (
  doc: { name: string; description?: string },
  response: { status: HttpStatus; model: any },
  request?: { body?: { model: any; mock: any }; queries?: ApiQueryOptions[]; params?: ApiParamOptions[] },
) => {
  const decorators = [
    ApiBadRequestResponse({ description: 'Bad Request', type: ErrorResponseDto }),
    ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: ErrorResponseDto,
    }),
    ApiOperation({ summary: doc?.description ?? doc.name }),
    ApiResponse({
      status: response.status,
      description: 'Success',
      type: response.model,
    }),
    // ... rest unchanged
  ];
  // ...
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Each service/guard throws correct `ErrorKind` | Test-first: write failing test expecting `DomainError` with `.kind.kind === 'EXPECTED_KIND'`, then implement. Use `rejects.toBeInstanceOf(DomainError)` + `expect(error.kind.kind).toBe('KIND')` |
| Unit | `AllExceptionsFilter` translates new kinds via i18n | Extend existing filter tests: for each new `ErrorKind`, create `DomainError.fromKind('KIND')`, pass through filter with `Accept-Language: en/es/pt`, assert `message` matches spec values |
| Unit | Parameter service validation | Test `update()` throws `PARAMETER_NOT_FOUND`, `PARAMETER_OVERRIDDEN`, `PARAMETER_VALUE_INVALID` for each invalid input |
| Unit | Guard behavior | Mock `ExecutionContext` with/without user/roles/permissions; assert `DomainError.fromKind('FORBIDDEN')` or `INVALID_TOKEN` thrown |
| Integration | Auth flow end-to-end | E2E tests: register duplicate → 409 UA-AUTH-001; login wrong creds → 401 UA-AUTH-002; locked account → 423 UA-AUTH-003; expired tokens → 400 UA-AUTH-005/006/007 |
| Integration | Parameter admin API | PUT `/admin/parameters/:key` with invalid key/value/env-override → correct error codes via filter |
| Regression | Existing tests pass | Run full suite (`npm test`); update any test asserting `HttpException`/`AccountLockedException`/`ConflictException`/`NotFoundException`/`BadRequestException`/`ForbiddenException`/`UnauthorizedException` to expect `DomainError` with correct kind |

**Test files to update** (non-exhaustive):
- `src/auth/auth.service.spec.ts` — 11 error paths
- `src/email/service/email-template.service.spec.ts` — 6 error paths
- `src/config/parameters/parameter-admin.controller.spec.ts` — 7 error paths → move assertions to `parameter.service.spec.ts`
- `src/auth/guards/*.guard.spec.ts` — 6 error paths
- `src/user/controller/user-profile.controller.spec.ts` — 1 error path
- `src/user/service/user.service.spec.ts` — 1 error path (requestEmailChange)
- `src/user/repository/user.repository.spec.ts` — 1 error path (update)
- `src/app/service/app.service.spec.ts` — 1 error path (messageMicroservice)

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary changes. This is a pure application-layer error handling refactor.

## Migration / Rollout

No data migration required. Feature flag not needed — all changes are on feature branch `feat/cou-203-error-handling` with rollback plan in proposal.

**Work unit sequencing** (each independently green):

1. **Registry + i18n** — Add 20 `ErrorKind` entries + 14 keys × 3 langs. Run filter tests to verify translation.
2. **Auth service** — Migrate 11 throws; remove `AccountLockedException` import; update auth tests.
3. **Email template service** — Migrate 6 throws; update email tests.
4. **Parameters** — Add service methods; migrate controller to delegation; update parameter tests.
5. **Guards** — Migrate 6 throws in 3 guards; update guard tests (convert last per risk mitigation).
6. **Leftovers + deletion + swagger** — 4 leftover throws; delete 13 legacy files (grep-verified); update `defaults.decorator.ts` to `ErrorResponseDto`.

## Open Questions

- [ ] Confirm `ErrorKind.INTERNAL` default message "Internal server error" is acceptable for `user.repository.ts:137` (currently throws generic `Error` with `User ${id} not found`) — spec maps this to `USER_NOT_FOUND` (existing), not `INTERNAL`. Design follows spec.
- [ ] Guard `FORBIDDEN` messages currently include dynamic context (required roles). Spec uses static i18n "Access denied" — confirmed acceptable (no interpolation in filter).
- [ ] `parameter.service.ts` bootstrap `throw new Error()` (lines 12-15) is out of scope per proposal — document as known gap.