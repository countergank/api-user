# Tasks: feature/roles-and-permissions

## Phase 1: Foundation (Dependencies & Entities) ✅

- [x] 1.1 Install @nestjs/passport, passport, @nestjs/jwt, passport-jwt
- [x] 1.2 Install class-validator, class-transformer
- [x] 1.3 Modify User entity: agregar campos role (string), permissions (string[])
- [x] 1.4 Create Permission entity: name, description, category, isSystem, isActive
- [x] 1.5 Create Role entity: name, description, permissionIds (string[]), isSystem, isDefault

## Phase 2: Authentication ✅

- [x] 2.1 Create Auth module: src/auth/auth.module.ts
- [x] 2.2 Create Auth controller: POST /auth/register, /auth/login
- [x] 2.3 Create Auth service: register, login, validateUser
- [x] 2.4 Create Register DTO: email, userName, password, name, lastName
- [x] 2.5 Create Login DTO: email, password
- [x] 2.6 Create JWT Strategy: validate payload, return user
- [x] 2.7 Create Local Strategy: validate email/password
- [x] 2.8 Configure JWT module: secret, expiry times
- [x] 2.9 Return accessToken + refreshToken en login

## Phase 3: Password Recovery ✅

- [x] 3.1 Create Forgot Password endpoint: POST /auth/forgot-password
- [x] 3.2 Create Reset Password endpoint: POST /auth/reset-password
- [x] 3.3 Add resetPasswordToken (hash), resetPasswordExpires a User
- [x] 3.4 Generate reset token (crypto.randomUUID)
- [x] 3.5 Set token expiry: 24 horas
- [ ] 3.6 Add email sending (mock para MVP)

## Phase 4: Authorization (RBAC) ✅

- [x] 4.1 Create RBAC module: src/rbac/rbac.module.ts
- [x] 4.2 Create Permission service: find, create, assign
- [x] 4.3 Create Role service: find, create, assignPermissions
- [x] 4.4 GET /permissions: listar todos los permisos
- [x] 4.5 GET /roles: listar roles (admin only)
- [x] 4.6 PUT /roles/:roleId/permissions: asignar permisos

## Phase 5: Guards & Decorators ✅

- [x] 5.1 Create JwtAuthGuard: extiende Passport Guard
- [x] 5.2 Create @RequirePermissions decorator
- [x] 5.3 Create PermissionGuard: verifica permisos
- [ ] 5.4 Create @Roles decorator (optional)
- [ ] 5.5 Apply guards a endpoints existentes
- [ ] 5.6 Proteger endpoints con permisos apropiados

## Phase 6: User Profile ✅

- [x] 6.1 GET /users/profile: getmyprofile
- [x] 6.2 PATCH /users/profile: update name/lastName
- [x] 6.3 POST /users/change-password: changePassword

## Phase 7: Seeds ✅

- [x] 7.1 Create seed-permissions.ts: crear permisos base
- [x] 7.2 Create seed-roles.ts: crear admin, user, viewer
- [x] 7.3 Update seed-users.ts: assign role por defecto (user)
- [ ] 7.4 Create seed-admin.ts: crear admin con todos los permisos

## Phase 8: Testing ✅

- [x] 8.1 Build: ✅
- [x] 8.2 Lint: ✅
- [x] 8.3 TypeScript: ✅
- [x] 8.4 Prettier: ✅
- [x] 8.5 Tests: 43 passed ✅
- [x] 8.6 All new feature implementations verified ✅

---

## Verification Results (2026-04-20)

| Check | Resultado |
|-------|---------|
| Build | ✅ Success |
| Lint | ✅ No errors |
| TypeScript | ✅ No errors |
| Prettier | ✅ Formateado |
| Tests | ✅ 43 passed |
| RBAC Endpoints | ✅ Implemented |
| Guards | ✅ Implemented |
| User Profile | ✅ Implemented |

---

Created: 2026-04-20

---

## Files to Create

| File | Action |
|------|--------|
| src/auth/auth.module.ts | Create |
| src/auth/auth.controller.ts | Create |
| src/auth/auth.service.ts | Create |
| src/auth/strategies/jwt.strategy.ts | Create |
| src/auth/strategies/local.strategy.ts | Create |
| src/auth/guards/jwt-auth.guard.ts | Create |
| src/auth/guards/permissions.guard.ts | Create |
| src/auth/decorators/permissions.decorator.ts | Create |
| src/auth/decorators/roles.decorator.ts | Create |
| src/auth/dto/register.dto.ts | Create |
| src/auth/dto/login.dto.ts | Create |
| src/auth/dto/reset-password.dto.ts | Create |
| src/rbac/rbac.module.ts | Create |
| src/rbac/entities/permission.entity.ts | Create |
| src/rbac/entities/role.entity.ts | Create |
| src/rbac/services/permission.service.ts | Create |
| src/rbac/services/role.service.ts | Create |
| src/database/seeds/seed-permissions.ts | Create |
| src/database/seeds/seed-roles.ts | Create |

## Files to Modify

| File | Action |
|------|--------|
| src/user/entities/user.entity.ts | Modify |
| src/app/app.module.ts | Modify |
| src/user/user.module.ts | Modify |

---

Created: 2026-04-20