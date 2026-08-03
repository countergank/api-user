# Design: Migrate controllers and services to DomainError

## Technical Approach

Replace all legacy error classes (`UserNotFoundError`, `UserEmailAlreadyExistsError`, etc.) with `DomainError.fromKind(ErrorKind.*)` in services, then remove the try/catch boilerplate from controllers. The AllExceptionsFilter (already in place) handles the final HTTP mapping.

## Architecture Decisions

### Decision: ErrorKind mapping

| Legacy class | ErrorKind | Group | Status |
|---|---|---|---|
| `UserNotFoundError` | `USER_NOT_FOUND` | USR | 404 |
| `UserAlreadyDeletedError` | `USER_ALREADY_DELETED` | USR | 410 |
| `UserEmailAlreadyExistsError` | `ENTITY_EMAIL_ALREADY_EXISTS` | COM | 409 |
| `UserNameAlreadyExistsError` | `ENTITY_NAME_ALREADY_EXISTS` | COM | 409 |
| `AppVersionNotFoundError` | `APP_VERSION_NOT_FOUND` | APP | 404 |
| `UserPopulateError` → seed error | `INTERNAL` | COM | 500 |

**Rationale**: All required ErrorKind entries already exist from COU-203 Phase 1. No new entries needed.

### Decision: UserPopulateError stays

**Choice**: Keep `UserPopulateError` but replace its throw with `DomainError.fromKind(ErrorKind.INTERNAL)`.
**Rationale**: It wraps a Mongoose population error in the root user seeder. Not a domain error, but using `DomainError` ensures uniform handling through the filter.

### Decision: Legacy class removal

**Choice**: Remove all user error classes after migration, along with the `UserErrors` export array. Keep `AppErrors` array if anything references it externally.
**Rationale**: Once no services or controllers throw them, they become dead code.

## Migration Strategy

1. **Service layer first** — replace all throw statements, update tests to expect DomainError
2. **Test update** — change `rejects.toBeInstanceOf(UserNotFoundError)` → `rejects.toBeInstanceOf(DomainError)` and verify `.kind`
3. **Controller cleanup** — remove try/catch, imports, and instanceof checks
4. **Legacy deletion** — remove error-instances.error.ts files, delete spec files for removed classes

## Data Flow

```
Controller (no try/catch) ──→ Service ──→ Repository
                                      │
                             DomainError thrown ──→ AllExceptionsFilter ──→ ErrorResponseDto
```

**Before (current):**
```
Controller try/catch → catches legacy error → re-throws HttpException → ErrorFilter (legacy)
Service throws UserNotFoundError, etc.
```

**After (target):**
```
Controller (pure delegation) → Service throws DomainError → AllExceptionsFilter → ErrorResponseDto
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/user/service/user.service.ts` | Modify | 11 throw statements → `DomainError.fromKind()` |
| `src/user/service/user.service.spec.ts` | Modify | 10 test expectations → DomainError |
| `src/user/controller/user.controller.ts` | Modify | Remove try/catch in 7 methods, remove legacy imports |
| `src/user/controller/user.controller.spec.ts` | Modify | Update mock rejections → DomainError |
| `src/user/repository/user.repository.ts` | Modify | `throw new UserPopulateError()` → `DomainError.fromKind()` |
| `src/app/service/app.service.ts` | Modify | `throw new AppVersionNotFoundError()` → `DomainError.fromKind()` |
| `src/app/service/app.service.spec.ts` | Modify | Update test expectation |
| `src/app/controller/app.controller.ts` | Modify | Remove try/catch in 2 methods, remove legacy imports |
| `src/app/controller/app.controller.spec.ts` | Modify | Update mock rejection → DomainError |
| `src/user/errors/error-instances.error.ts` | Delete | Legacy class definitions |
| `src/user/errors/error-instances.spec.ts` | Delete | Legacy test |
| `src/user/errors/errors.spec.ts` | Delete | Legacy test |
| `src/app/errors/error-instances.error.ts` | Modify or Delete | Remove AppVersionNotFoundError if no consumers left |
| `src/app/errors/error-instances.spec.ts` | Modify | Remove AppVersionNotFoundError test |

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Service throws DomainError | Update `rejects.toBeInstanceOf` → DomainError, verify `.kind` matches |
| Unit | Controller returns correctly | No try/catch → service error propagates to filter. Verify via existing filter tests. |
| Legacy | Removed classes | Delete spec files for removed classes |

## Migration / Rollout

No migration required. Pure refactor — no data or config changes.

## Open Questions

None — scope is well understood.
