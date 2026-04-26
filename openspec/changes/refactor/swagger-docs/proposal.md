# Proposal: refactor/swagger-docs

## Intent

Standardize API documentation patterns across ALL NestJS modules (auth, rbac, user, user-profile, app) by creating per-module `api-docs/` directories with custom decorator functions and complete request/response examples. This ensures consistency, improves developer experience, and makes OpenAPI documentation maintainable across a growing codebase.

## Context

- **Current State**: `@nestjs/swagger` v7.4.0 with 7 controllers across 5 modules
- **Pattern Issues**: Mixed approach — `user/` and `app/` use custom decorator functions; `auth/`, `rbac/`, `user-profile` use inline decorators
- **Missing Documentation**: No `api-docs/` directories for `rbac/` and `auth/` modules
- **Gaps**: `permission.controller.ts` has NO examples; `user-profile.controller.ts` uses inline decorators instead of `user/api-docs/`; `common/api-docs/` violates project standard (docs should be per-module)

## Scope

### In Scope ✅ (FULL SCOPE - per user request "implementar ese refactor en TODOS los controladores")

1. Create `src/rbac/api-docs/` with decorator functions and examples (missing today)
2. Create `src/auth/api-docs/` with decorator functions and examples (missing today)
3. Refactor `user-profile.controller.ts` to use existing `user/api-docs/` decorators
4. Refactor `role.controller.ts` to use new `rbac/api-docs/` decorators
5. Refactor `permission.controller.ts` to use new `rbac/api-docs/` decorators + add missing examples
6. Refactor `auth.controller.ts` to use new `auth/api-docs/` decorators
7. Ensure `app/api-docs/` has complete examples for all endpoints
8. Deprecate `common/api-docs/` (move any reusable patterns to respective modules)

### Out of Scope ❌

- Creating entirely new endpoints (not documentation work)
- Modifying business logic

## Approach

### Target Pattern (per project standard):

```
src/{module}/
├── controller/
│   └── {module}.controller.ts
└── api-docs/
    ├── index.ts
    ├── {module}.decorator.ts      # Custom decorator functions
    └── examples/
        ├── {operation}.request.ts
        └── {operation}.response.ts
```

### Phase Breakdown

**Phase 1: Create missing api-docs/ directories**
- Create `src/rbac/api-docs/`: decorator functions + examples for role and permission endpoints
- Create `src/auth/api-docs/`: decorator functions + examples for auth endpoints

**Phase 2: Migrate inline decorators to decorator functions**
- Refactor `role.controller.ts` → use `rbac/api-docs/` decorators
- Refactor `permission.controller.ts` → use `rbac/api-docs/` decorators + add missing examples
- Refactor `auth.controller.ts` → use `auth/api-docs/` decorators

**Phase 3: Consolidate user modules**
- Refactor `user-profile.controller.ts` → use existing `user/api-docs/` decorators
- Verify `app/api-docs/` has complete examples for all endpoints

**Phase 4: Deprecate common/api-docs/**
- Audit `common/api-docs/` for reusable patterns
- Migrate any reusable patterns to respective modules
- Mark `common/api-docs/` as deprecated (delete or document migration path)

## Rollback Plan

```bash
# Restore api-docs directories
git restore src/rbac/api-docs/
git restore src/auth/api-docs/

# Restore controller changes
git restore src/auth/auth.controller.ts
git restore src/rbac/controllers/role.controller.ts
git restore src/rbac/controllers/permission.controller.ts
git restore src/user/controller/user-profile.controller.ts
```

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking OpenAPI output | Runtime docs fail | Test locally with `/api/docs` before PR |
| Inconsistent patterns | Confusion in future | Follow existing `user/api-docs/` exactly |
| Scope creep | Delay | Complete in phases, can pause after Phase 1 |
| Missing examples | Incomplete docs | Verify each endpoint has request + response example |

## Resources

- **Complexity**: Medium (refactor across 6 controllers)
- **Estimated Time**: 4-6 hours
- **Dependencies**: `@nestjs/swagger` already installed, no new packages
- **Testing**: Manual — verify swagger-ui renders correctly

## Related Artifacts

- `src/user/api-docs/` — existing pattern to follow
- `src/app/api-docs/` — existing pattern to follow
- `openspec/changes/refactor/swagger-docs/` — change artifacts directory