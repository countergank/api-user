# Archived: refactor/swagger-docs

Completed on: 2026-04-26

## Summary

Standardized API documentation patterns across ALL NestJS controllers by creating per-module `api-docs/` directories with custom decorator functions and complete request/response examples.

### Key Achievements
- Created `rbac/api-docs/` with decorator functions and examples
- Created `auth/api-docs/` with decorator functions and examples
- Updated `user-profile.controller.ts` to use custom decorators
- Added examples to `user.controller.ts` endpoints (GET /, GET /:id)
- Updated `app/api-docs/app.decorator.ts` to use getSchemaPath() pattern
- Unified examples structure: all modules now use `examples/` directory with classes using `@ApiProperty`
- Refactored all decorators to import examples from external files instead of inline

### Notes
- `common/api-docs/defaults.decorator.ts` kept for backwards compatibility (no longer required)
- All 43 tests pass
- Verification: Manual check in Swagger UI confirmed all examples render correctly

## Files Changed

### Created
- `src/rbac/api-docs/index.ts`
- `src/rbac/api-docs/rbac.decorator.ts`
- `src/rbac/api-docs/examples/role.examples.ts`
- `src/rbac/api-docs/examples/permission.examples.ts`
- `src/auth/api-docs/index.ts`
- `src/auth/api-docs/auth.decorator.ts`
- `src/auth/api-docs/examples/register.examples.ts`
- `src/auth/api-docs/examples/login.examples.ts`
- `src/auth/api-docs/examples/password.examples.ts`
- `src/auth/api-docs/examples/refresh.examples.ts`
- `src/user/api-docs/examples/user.examples.ts`
- `src/user/api-docs/examples/get-profile.response.ts`
- `src/user/api-docs/examples/update-profile.request.ts`
- `src/user/api-docs/examples/change-password.request.ts`

### Modified
- `src/rbac/controllers/role.controller.ts`
- `src/rbac/controllers/permission.controller.ts`
- `src/auth/auth.controller.ts`
- `src/user/controller/user.controller.ts`
- `src/user/controller/user-profile.controller.ts`
- `src/user/api-docs/index.ts`
- `src/user/api-docs/user.decorator.ts`
- `src/user/api-docs/user-profile.decorator.ts`
- `src/app/controller/app.controller.ts`
- `src/app/api-docs/app.decorator.ts`

### Deleted
- Multiple old example files consolidated into new structure

## Branch
- `feature/refactor-swagger-docs`