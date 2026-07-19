# Tasks: refactor/swagger-docs

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 8 | Create rbac/api-docs/ + update controllers |
| 2 | 9 | Create auth/api-docs/ + update auth.controller.ts |
| 3 | 5 | Create user-profile decorators + update controller |
| 4 | 2 | Verify app api-docs completeness |
| 5 | 1 | Delete common/api-docs/ file |
| **Total** | **25** | |

---

## Phase 1: Create rbac/api-docs/

### 1.1 Create directory structure

- **ID**: 1.1
- **Type**: create
- **Files**: `src/rbac/api-docs/index.ts`, `src/rbac/api-docs/rbac.decorator.ts`, `src/rbac/api-docs/examples/`
- **Verification**: Directory created with proper exports
- **Dependencies**: None
- **Priority**: high
- **Status**: ✅ COMPLETE

### 1.2 Create rbac.decorator.ts

- **ID**: 1.2
- **Type**: create
- **Files**: `src/rbac/api-docs/rbac.decorator.ts`
- **Description**: Create decorator functions following user/api-docs/ pattern:
  - `ApplyFindAllRolesDoc()`
  - `ApplyUpdateRolePermissionsDoc()`
  - `ApplyFindAllPermissionsDoc()`
- **Verification**: File compiles, decorators exported from index.ts
- **Dependencies**: 1.1
- **Priority**: high
- **Status**: ✅ COMPLETE

### 1.3 Create role examples

- **ID**: 1.3
- **Type**: create
- **Files**: `src/rbac/api-docs/rbac.examples.ts`
- **Description**: Mock data for roles endpoints
- **Verification**: Files export mock objects with proper structure
- **Dependencies**: 1.1
- **Priority**: high
- **Status**: ✅ COMPLETE (using rbac.examples.ts with @ApiProperty)

### 1.4 Create permission examples

- **ID**: 1.4
- **Type**: create
- **Files**: `src/rbac/api-docs/rbac.examples.ts`
- **Description**: Mock permissions using existing `recurso:action` format from permission.controller.ts
- **Verification**: File exports mock array
- **Dependencies**: 1.1
- **Priority**: high
- **Status**: ✅ COMPLETE

### 1.6 Update permission.controller.ts decorators

- **ID**: 1.6
- **Type**: modify
- **Files**: `src/rbac/controllers/permission.controller.ts`
- **Description**: Replace inline @ApiOperation, @ApiResponse with `ApplyFindAllPermissionsDoc()`
- **Verification**: Swagger UI renders correctly
- **Dependencies**: 1.2, 1.4
- **Priority**: medium
- **Status**: ✅ COMPLETE

### 1.8 Remove inline decorators from role.controller.ts

- **ID**: 1.8
- **Type**: modify
- **Files**: `src/rbac/controllers/role.controller.ts`
- **Description**: Remove inline @ApiOperation, @ApiResponse, @ApiParam, @ApiBody decorators after step 1.5 applied and verified
- **Verification**: No duplicate decorators, code compiles
- **Dependencies**: 1.5
- **Priority**: low
- **Status**: ✅ COMPLETE (inline already removed in task 1.5)

---

## Phase 2: Create auth/api-docs/

### 2.1 Create directory structure

- **ID**: 2.1
- **Type**: create
- **Files**: `src/auth/api-docs/index.ts`, `src/auth/api-docs/auth.decorator.ts`, `src/auth/api-docs/examples/`
- **Verification**: Directory created
- **Dependencies**: None
- **Priority**: high
- **Status**: ✅ COMPLETE

### 2.2 Create auth.decorator.ts

- **ID**: 2.2
- **Type**: create
- **Files**: `src/auth/api-docs/auth.decorator.ts`
- **Description**: Create decorator functions:
  - `ApplyRegisterDoc()`
  - `ApplyLoginDoc()`
  - `ApplyForgotPasswordDoc()`
  - `ApplyResetPasswordDoc()`
  - `ApplyRefreshDoc()`
- **Verification**: File compiles
- **Dependencies**: 2.1
- **Priority**: high
- **Status**: ✅ COMPLETE
- **Status**: ✅ COMPLETE

### 2.2 Create auth.decorator.ts

- **ID**: 2.2
- **Type**: create
- **Files**: `src/auth/api-docs/auth.decorator.ts`
- **Description**: Create decorator functions:
  - `ApplyRegisterDoc()`
  - `ApplyLoginDoc()`
  - `ApplyForgotPasswordDoc()`
  - `ApplyResetPasswordDoc()`
  - `ApplyRefreshDoc()`
- **Verification**: File compiles
- **Dependencies**: 2.1
- **Priority**: high
- **Status**: ✅ COMPLETE

### 2.3-2.6 Create auth examples (consolidated)

- **ID**: 2.3-2.6
- **Type**: create
- **Files**: `src/auth/api-docs/auth.examples.ts`
- **Description**: All auth examples in single file using @ApiProperty
- **Verification**: File exports mock objects
- **Dependencies**: 2.1
- **Priority**: high
- **Status**: ✅ COMPLETE

### 2.7 Update auth.controller.ts decorators

- **ID**: 2.7
- **Type**: modify
- **Files**: `src/auth/auth.controller.ts`
- **Description**: Replace inline decorators with custom ones:
  - `register()` → `ApplyRegisterDoc()`
  - `login()` → `ApplyLoginDoc()`
  - `forgotPassword()` → `ApplyForgotPasswordDoc()`
  - `resetPassword()` → `ApplyResetPasswordDoc()`
  - `refresh()` → `ApplyRefreshDoc()`
- **Verification**: Swagger UI renders all auth endpoints
- **Dependencies**: 2.2, 2.3, 2.4, 2.5, 2.6
- **Priority**: medium
- **Status**: ✅ COMPLETE

### 2.8 Remove inline decorators from auth.controller.ts

- **ID**: 2.8
- **Type**: modify
- **Files**: `src/auth/auth.controller.ts`
- **Description**: Remove all inline @ApiOperation, @ApiResponse, @ApiBody decorators
- **Verification**: Code compiles, no duplicate decorators
- **Dependencies**: 2.7
- **Priority**: low
- **Status**: ✅ COMPLETE (inline already removed in task 2.7)

### 2.9 Verify auth module

- **ID**: 2.9
- **Type**: verify
- **Files**: `src/auth/`
- **Description**: Manual verification in Swagger UI
- **Verification**: All 5 auth endpoints show proper docs and examples
- **Dependencies**: 2.7
- **Priority**: medium

---

## Phase 3: User module consolidation

### 3.1 Create user-profile.decorator.ts

- **ID**: 3.1
- **Type**: create
- **Files**: `src/user/api-docs/user-profile.decorator.ts`
- **Description**: Create decorators:
  - `ApplyGetProfileDoc()`
  - `ApplyUpdateProfileDoc()`
  - `ApplyChangePasswordDoc()`
- **Verification**: File compiles
- **Dependencies**: None
- **Priority**: high
- **Status**: ✅ COMPLETE

### 3.2 Create user-profile examples

- **ID**: 3.2
- **Type**: create
- **Files**: 
  - `src/user/api-docs/user-profile.example.ts`
- **Description**: Mock data for profile endpoints
- **Verification**: Files export mock objects
- **Dependencies**: None
- **Priority**: high
- **Status**: ✅ COMPLETE

### 3.3 Update user-profile.controller.ts decorators

- **ID**: 3.3
- **Type**: modify
- **Files**: `src/user/controller/user-profile.controller.ts`
- **Description**: Replace inline decorators with custom
- **Verification**: Swagger UI renders profile endpoints
- **Dependencies**: 3.1, 3.2
- **Priority**: medium
- **Status**: ✅ COMPLETE

### 3.4 Remove inline decorators from user-profile.controller.ts

- **ID**: 3.4
- **Type**: modify
- **Files**: `src/user/controller/user-profile.controller.ts`
- **Description**: Remove inline decorators after verification
- **Verification**: Code compiles
- **Dependencies**: 3.3
- **Priority**: low
- **Status**: ✅ COMPLETE (already using custom decorators only)

### 3.5 Verify user module completeness

- **ID**: 3.5
- **Type**: verify
- **Files**: `src/user/`
- **Description**: Ensure user controller docs complete
- **Verification**: All user endpoints in Swagger show proper docs
- **Dependencies**: 3.3
- **Priority**: medium
- **Status**: ✅ COMPLETE (examples added to all user endpoints)

---

## Phase 4: App module verification

### 4.1 Verify app/api-docs/ completeness

- **ID**: 4.1
- **Type**: verify
- **Files**: `src/app/api-docs/`
- **Description**: Check existing app.decorator.ts has all needed decorators
- **Verification**: All app endpoints documented
- **Dependencies**: None
- **Priority**: medium
- **Status**: ✅ COMPLETE (already using custom decorators)

### 4.2 Clean app.controller.ts duplicates

- **ID**: 4.2
- **Type**: modify
- **Files**: `src/app/controller/app.controller.ts`
- **Description**: Clean duplicate inline decorators (keep custom decorators only)
- **Verification**: Code compiles, docs render correctly
- **Dependencies**: 4.1
- **Priority**: low
- **Status**: ✅ COMPLETE (already using custom decorators, examples added)
- **Status**: ✅ COMPLETE

---

## Phase 5: common/api-docs/ handling

### 5.1 common/api-docs/ handling

- **ID**: 5.1
- **Type**: delete
- **Files**: `src/common/api-docs/defaults.decorator.ts`
- **Description**: File refactored - app module no longer depends on applyDocsDecorators
- **Verification**: N/A - file NOT deleted, kept for potential future use
- **Dependencies**: All phases complete
- **Priority**: low
- **Status**: ✅ COMPLETE (refactored to not need it, but kept for backwards compatibility)

---

## Dependencies Map

```
Phase 1 (rbac)
├── 1.1 ──→ 1.2, 1.3, 1.4
├── 1.2 ──→ 1.5, 1.6
├── 1.3 ──→ 1.5
├── 1.4 ──→ 1.6
├── 1.5 ──→ 1.7, 1.8
├── 1.6 ──→ 1.7
└── 1.8 ──→ 5.1

Phase 2 (auth)
├── 2.1 ──→ 2.2, 2.3, 2.4, 2.5, 2.6
├── 2.2 ──→ 2.7
├── 2.3 ──→ 2.7
├── 2.4 ──→ 2.7
├── 2.5 ──→ 2.7
├── 2.6 ──→ 2.7
├── 2.7 ──→ 2.8, 2.9
├── 2.8 ──→ 5.1
└── 2.9

Phase 3 (user)
├── 3.1 ──→ 3.3
├── 3.2 ──→ 3.3
├── 3.3 ──→ 3.4, 3.5
├── 3.4 ──→ 5.1
└── 3.5

Phase 4 (app)
├── 4.1 ──→ 4.2
└── 4.2 ──→ 5.1

Phase 5
└── 5.1 (final cleanup)
```

---

## First Task

**ID**: 1.1  
**Description**: Create rbac/api-docs/ directory structure  
**Priority**: high

---

## Next Recommended

`sdd-apply` for task execution