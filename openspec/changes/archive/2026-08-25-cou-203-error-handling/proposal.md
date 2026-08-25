# Proposal: COU-203 Error Handling System Replication

## Intent

api-user currently has a fragmented error handling system: a complex `ErrorBase` class hierarchy with per-module error classes, multilingual dictionaries, manual try/catch in controllers, and an `ErrorFilter` missing traceId, unified DTO, and HttpException handling. The backend-template (backend-nosql-standard-project) provides a cleaner pattern: `DomainError` with `ErrorKind` registry, unified `ErrorResponseDto`, global `AllExceptionsFilter` with auto traceId, `TraceIdMiddleware`, and validation pipe — all working together so services throw `DomainError` and controllers have zero try/catch. COU-203 adapts this pattern to api-user while preserving its i18n and UA-{GROUP}-{CODE} format.

## Scope

### In Scope
- New `ErrorResponseDto` with `{ statusCode, code, message, details?, traceId, timestamp }`
- New `TraceIdMiddleware` extracting `request.id` (from `hyperid`/`nestjs-cls`) into `x-trace-id` header
- New `AllExceptionsFilter` catching `DomainError` → `HttpException` → `Error`, auto-injecting traceId
- New `DomainError` class with adapted `ErrorKind` registry (preserving UA-{GROUP}-{CODE} format)
- New `ValidationPipe` producing `ErrorResponseDto`-shaped validation errors
- Module-by-module migration of services to throw `DomainError` instead of `ErrorBase` subclasses
- Removal of manual try/catch blocks from controllers during migration
- Update existing `openspec/specs/error-handling/spec.md` as the capability spec

### Out of Scope
- Removing `ErrorBase` hierarchy entirely (phased migration, backward compatibility during transition)
- Rewriting all existing i18n dictionaries (preserve and adapt)
- Changing `nestjs-cls` / `hyperid` setup (already present)
- Internationalization strategy redesign (preserve existing i18n keys/messages)
- Module business logic changes beyond error throwing patterns

## Capabilities

### New Capabilities
- `error-response-dto`: Unified error response shape with traceId and timestamp
- `trace-id-middleware`: Extracts request ID from `nestjs-cls`/`hyperid`, sets `x-trace-id` header
- `all-exceptions-filter`: Global filter catching DomainError → HttpException → Error, auto-injects traceId
- `domain-error`: DomainError class with ErrorKind registry (UA-{GROUP}-{CODE}), factory methods
- `validation-pipe`: Custom ValidationPipe producing ErrorResponseDto-shaped validation errors

### Modified Capabilities
- `error-handling`: Existing placeholder spec at `openspec/specs/error-handling/spec.md` — will become the canonical spec for the unified error handling system (replacing placeholder)

## Approach

**Recommended: Option B — Adaptive Migration**

Adopt backend-template's clean architecture (DomainError, ErrorKind, global filter, traceId middleware, validation pipe) but **adapt** two key aspects to api-user:
1. **Error code format**: Keep `UA-{GROUP}-{CODE}` (e.g., `UA-AUTH-001`) instead of backend-template's bare kind names
2. **Internationalization**: Integrate existing i18n dictionaries into `ErrorResponseDto.message` via NestJS `I18nService` in the filter

**Option A — Direct Replication** (rejected): Copy backend-template verbatim. Would lose i18n, break existing error codes, require full rewrite of all modules at once.

**Phased Migration Plan:**

| Phase | Deliverable | Scope |
|-------|-------------|-------|
| 1 | Foundation | `ErrorResponseDto`, `TraceIdMiddleware`, `AllExceptionsFilter`, `ValidationPipe` |
| 2 | DomainError | `DomainError` class, adapted `ErrorKind` registry with UA-{GROUP}-{CODE}, factory methods |
| 3 | Validation | Custom `ValidationPipe` producing `ErrorResponseDto` shape |
| 4+ | Module Migration | Per-module: replace `ErrorBase` throws with `DomainError.fromKind()`, remove controller try/catch |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/common/dto/error-response.dto.ts` | New | Unified error response DTO |
| `src/common/middleware/trace-id.middleware.ts` | New | Extracts request ID, sets x-trace-id header |
| `src/common/filters/all-exceptions.filter.ts` | New | Global exception filter with traceId injection |
| `src/common/errors/domain-error.ts` | New | DomainError class + ErrorKind registry |
| `src/common/pipes/validation.pipe.ts` | New | ValidationPipe producing ErrorResponseDto |
| `src/common/errors/` | Modified | Preserve ErrorBase hierarchy for backward compat during migration |
| `src/modules/*/services/*.service.ts` | Modified | Migrate to throw DomainError.fromKind() |
| `src/modules/*/controllers/*.controller.ts` | Modified | Remove manual try/catch blocks |
| `openspec/specs/error-handling/spec.md` | Modified | Expand placeholder to full capability spec |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Existing ErrorBase subclasses break during phased migration | Medium | Keep ErrorBase hierarchy functional; DomainError.fromKind() can wrap ErrorBase instances temporarily |
| i18n message keys mismatch between old and new system | Medium | Map ErrorKind to existing i18n keys in filter; preserve dictionary files |
| Controllers missed during try/catch removal | Low | Automated search for `try {` / `catch` patterns in controllers; lint rule |
| traceId not propagating through CLS context in async flows | Low | `nestjs-cls` already configured; verify with integration test |
| ValidationPipe breaking existing DTO validation expectations | Low | New pipe produces same error shape; test existing validation scenarios |

## Rollback Plan

1. Revert `main.ts` global filter/pipe/middleware registrations
2. Delete new files: `error-response.dto.ts`, `trace-id.middleware.ts`, `all-exceptions.filter.ts`, `domain-error.ts`, `validation.pipe.ts`
3. Restore previous `ErrorFilter` registration in `main.ts`
4. Controllers retain existing try/catch (unchanged during migration)
5. No database migrations needed — purely application-layer change

## Dependencies

- `nestjs-cls` (already installed, configured)
- `hyperid` (already installed for request IDs)
- `@nestjs/swagger` for DTO documentation (already present)
- Existing i18n module (`nestjs-i18n`) for message resolution

## Success Criteria

- [ ] All controllers have zero manual try/catch blocks for error handling
- [ ] All services throw `DomainError.fromKind('UA-XXX-NNN')` instead of `throw new XError()`
- [ ] Every error response includes `traceId` matching `x-trace-id` header
- [ ] Validation errors return `ErrorResponseDto` shape (not class-validator raw output)
- [ ] Existing i18n keys resolve correctly in error responses (es/en)
- [ ] All existing e2e tests pass without modification to error assertions
- [ ] `openspec/specs/error-handling/spec.md` documents the complete capability

## Non-Goals

- Replacing `nestjs-i18n` with a different i18n solution
- Changing request ID generation (keep `hyperid`)
- Modifying `nestjs-cls` configuration
- Removing `ErrorBase` hierarchy in this change (deferred to follow-up)
- Changing HTTP status code mappings (preserve current mappings)