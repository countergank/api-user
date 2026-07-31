# Proposal: Migrate controllers and services to DomainError

## Intent

Controllers and services still use the legacy error pattern (throw legacy classes → catch → re-throw HttpException). The DomainError infrastructure from COU-203 Phase 1 is in place but unused. This change eliminates the try/catch boilerplate in controllers and aligns api-user with the `backend-nosql-standard-project` pattern.

## Scope

### In Scope
- All services: replace `throw new *Error()` → `DomainError.fromKind(ErrorKind.*)`
- All controllers: remove try/catch blocks that handle domain errors
- Cleanup: remove legacy error classes if they have no remaining consumers
- Tests: update to match new DomainError throws

### Out of Scope
- Adding new ErrorKind entries (use existing registry)
- Module-level error hierarchy redesign (COU-203 Phase 3+)
- Controller decorators or DTO restructuring

## Capabilities

### New Capabilities
None — this is a pure refactor of existing behavior.

### Modified Capabilities
- `error-handling` — controllers consume DomainError through filter, not catch blocks

## Approach

1. **Services first**: replace `throw new UserNotFoundError(id)` → `DomainError.fromKind(ErrorKind.USER_NOT_FOUND, { id })` across all services
2. **Tests**: update test expectations from legacy error classes to DomainError
3. **Controllers**: remove try/catch blocks, leave only delegation
4. **Legacy cleanup**: remove error classes with no remaining references

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/user/service/` | Modified | Replace legacy error throws |
| `src/user/controller/` | Modified | Remove try/catch |
| `src/auth/service/` | Modified | Replace legacy error throws |
| `src/auth/controller/` | Modified | Remove try/catch |
| `src/rbac/services/` | Modified | Replace legacy error throws |
| `src/rbac/controllers/` | Modified | Remove try/catch |
| `src/encode/` | Modified | Replace legacy error throws |
| `src/common/audit/controller/` | Modified | Remove try/catch |
| `src/**/errors/` | Removed | Legacy error classes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legacy error class still referenced elsewhere | Medium | Grep for remaining imports before deleting |
| Test expects legacy error constructor | Medium | Update test to expect DomainError |
| Error code mapping off by one | Low | Filter is already tested against every ErrorKind |

## Rollback Plan

Revert the commit. The DomainError infrastructure stays; only the consumer migration is rolled back.

## Dependencies

- COU-203 Phase 1 (completed) — DomainError, ErrorKind, AllExceptionsFilter

## Success Criteria

- [ ] Zero try/catch for domain errors in all controllers
- [ ] All services throw `DomainError.fromKind()` instead of legacy classes
- [ ] 592+ tests pass
- [ ] Error response format unchanged (verified by existing tests)
