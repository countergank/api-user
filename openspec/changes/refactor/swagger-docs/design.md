# Design: refactor/swagger-docs

## Technical Approach

Standardize API documentation across all modules by creating per-module `api-docs/` directories with reusable decorator functions and complete examples. Follow existing `user/api-docs/` pattern using `applyDecorators()` from NestJS.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Decorator naming** | `Apply{X}Doc()` pattern | Consistent with NestJS conventions; clear intent ("apply docs") |
| **File structure** | `{module}.decorator.ts` + `examples/` subdir | Follows project standard, separates concerns |
| **Examples format** | Export const objects with `$schema` or plain values | Matches existing `create-user.api-body.ts` pattern |
| **Helper function** | Create `applyDocsDecorators` per module | Avoid `common/api-docs/` dependency; modules own their docs |

### Decision: Deprecate `applyDocsDecorators` from `common/api-docs/`

**Choice**: Move `applyDocsDecorators` helper into each module's `api-docs/` or inline the pattern.
**Alternatives**: Keep in `common/` (violates per-module standard), use factory function.
**Rationale**: Project standard mandates per-module docs; `common/api-docs/` is a violation.

### Decision: App module has mixed patterns

**Choice**: Clean `app.controller.ts` to use only custom decorators.
**Alternatives**: Keep inline decorators (partial migration).
**Rationale**: All endpoints should follow consistent pattern for maintainability.

## Data Flow

```
Controller → Custom Decorator → applyDecorators() → @nestjs/swagger decorators
                    ↓
              examples/*.ts (mock data)
```

## File Changes

### Phase 1: Create rbac/api-docs/

| File | Action | Description |
|------|--------|-------------|
| `src/rbac/api-docs/index.ts` | Create | Exports all decorator functions |
| `src/rbac/api-docs/rbac.decorator.ts` | Create | `ApplyFindAllRolesDoc()`, `ApplyUpdateRolePermissionsDoc()`, `ApplyFindAllPermissionsDoc()` |
| `src/rbac/api-docs/examples/find-all-roles.response.ts` | Create | Mock roles array |
| `src/rbac/api-docs/examples/update-role-permissions.request.ts` | Create | Mock permission IDs |
| `src/rbac/api-docs/examples/find-all-permissions.response.ts` | Create | Mock permissions array |
| `src/rbac/controllers/role.controller.ts` | Modify | Replace inline decorators with `ApplyFindAllRolesDoc()`, `ApplyUpdateRolePermissionsDoc()` |
| `src/rbac/controllers/permission.controller.ts` | Modify | Replace inline decorators with `ApplyFindAllPermissionsDoc()` |

### Phase 2: Create auth/api-docs/

| File | Action | Description |
|------|--------|-------------|
| `src/auth/api-docs/index.ts` | Create | Exports all decorator functions |
| `src/auth/api-docs/auth.decorator.ts` | Create | `ApplyRegisterDoc()`, `ApplyLoginDoc()`, `ApplyForgotPasswordDoc()`, `ApplyResetPasswordDoc()`, `ApplyRefreshDoc()` |
| `src/auth/api-docs/examples/register.request.ts` | Create | Mock register payload |
| `src/auth/api-docs/examples/register.response.ts` | Create | Mock user + tokens |
| `src/auth/api-docs/examples/login.request.ts` | Create | Mock credentials |
| `src/auth/api-docs/examples/login.response.ts` | Create | Mock tokens |
| `src/auth/api-docs/examples/forgot-password.request.ts` | Create | Mock email |
| `src/auth/api-docs/examples/reset-password.request.ts` | Create | Mock token + newPassword |
| `src/auth/api-docs/examples/refresh.request.ts` | Create | Mock refresh token |
| `src/auth/api-docs/examples/refresh.response.ts` | Create | Mock tokens |
| `src/auth/auth.controller.ts` | Modify | Replace inline decorators with custom decorators |

### Phase 3: Consolidate user modules

| File | Action | Description |
|------|--------|-------------|
| `src/user/api-docs/user-profile.decorator.ts` | Create | `ApplyGetProfileDoc()`, `ApplyUpdateProfileDoc()`, `ApplyChangePasswordDoc()` |
| `src/user/api-docs/examples/get-profile.response.ts` | Create | Mock profile data |
| `src/user/api-docs/examples/update-profile.request.ts` | Create | Mock name/lastName |
| `src/user/api-docs/examples/change-password.request.ts` | Create | Mock current/new password |
| `src/user/controller/user-profile.controller.ts` | Modify | Replace inline decorators with `user/api-docs/` decorators |

### Phase 4: App module + deprecate common/

| File | Action | Description |
|------|--------|-------------|
| `src/app/api-docs/examples/get-version.response.ts` | Create | Mock version info |
| `src/app/controller/app.controller.ts` | Modify | Remove duplicate inline decorators (keep only custom decorators) |
| `src/common/api-docs/defaults.decorator.ts` | Delete | No longer needed after migration |

## Migration Strategy

1. **Create new files first** — verify structure before touching controllers
2. **Import and test incrementally** — add one decorator, test `/api/docs`
3. **Remove inline decorators only after** — custom decorator applied and verified
4. **Rollback**: `git restore` specific files if issues arise

### Step-by-step per controller:

1. Import custom decorator at top of file
2. Add decorator to endpoint method
3. Test Swagger UI renders correctly
4. Remove inline decorators

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Manual | Swagger UI renders | Access `/api/docs` after each phase |
| Visual | Examples visible | Check request/response examples in Swagger UI |
| Validation | No duplicate decorators | Inspect controller source after migration |

## Open Questions

- [ ] Should `common/api-docs/` patterns be moved to a shared location or duplicated per module?
- [ ] Add OpenAPI validation to test suite? (specs mention this as optional)

## Next Step

Ready for tasks (sdd-tasks).