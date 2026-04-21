# API Documentation - Technical Design

## Changes Required

### 1. JSDoc Comments

Agregar en cada controller y service:

```typescript
/**
 * Controller para manejo de autenticación
 * @public
 */
```

### 2. Swagger Descriptions

En cada endpoint agregar:
- `@ApiOperation({ summary: '...', description: '...' })`
- `@ApiResponse({ status: 200, description: '...' })`

### 3. DTO Examples

En cada DTO agregar:

```typescript
@ApiProperty({ 
  example: 'leandrojaviercepeda@gmail.com',
  description: 'Usuario email' 
})
```

### 4. Endpoints a Documentar

| Controller | Endpoints |
|-------------|-----------|
| AuthController | register, login, refresh, forgot-password, reset-password |
| UserController | create, findById, findAll |
| UserProfileController | profile, change-password |
| AppController | version, message-microservice |
| RoleController | find, updatePermissions |
| PermissionController | find |

## Files to Modify

- `src/auth/auth.controller.ts`
- `src/auth/auth.service.ts`
- `src/user/controller/user.controller.ts`
- `src/user/controller/user-profile.controller.ts`
- `src/user/service/user.service.ts`
- `src/app/controller/app.controller.ts`
- `src/rbac/controllers/role.controller.ts`
- `src/rbac/controllers/permission.controller.ts`
- `src/user/dto/*.ts`
- `src/app/dto/*.ts`