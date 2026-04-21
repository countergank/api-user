# Tasks: Admin User Management and Data Security

## Status: ✅ COMPLETED

## Tasks

### 1. Create RolesGuard and Decorator

- [x] 1.1 Crear `src/auth/decorators/roles.decorator.ts`
- [x] 1.2 Crear `src/auth/guards/roles.guard.ts`

### 2. Update User Entity

- [x] 2.1 Cambiar `isActive` default de `true` a `false`

### 3. Update CreateUserDTO

- [x] 3.1 Agregar campo `role: UserRole` obligatorio con `@IsEnum`
- [x] 3.2 Actualizar método `toEntity()` para incluir role

### 4. Update Response DTOs

- [x] 4.1 `UserDTO` - agregar campos `role` e `isActive`
- [x] 4.2 `CreateUserResponseDTO` - agregar campos `role` e `isActive`

### 5. Update UserController (Admin)

- [x] 5.1 Importar `RolesGuard` y `@Roles`
- [x] 5.2 Aplicar `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles(UserRole.ADMIN)`
- [x] 5.3 Usar `createWithRole()` con `isActive: true` en lugar de `create()`

### 6. Update AuthService

- [x] 6.1 Simplificar `AuthResponse` para no incluir datos sensibles
- [x] 6.2 Cambiar register para usar `isActive: false`
- [x] 6.3 Simplificar `generateAuthResponse()` - solo email, name, lastName

### 7. Update UserProfileController (Public)

- [x] 7.1 Simplificar `getProfile()` - solo name, lastName, email
- [x] 7.2 Simplificar `updateProfile()` - solo name, lastName, email

### 8. Update Seed

- [x] 8.1 Usar `createWithRole()` con `isActive: true`
- [x] 8.2 Remover imports innecesarios (`CreateUserDTO`)

### 9. Update Tests

- [x] 9.1 Actualizar mocks en `user.controller.spec.ts` para usar `createWithRole`

### 10. Documentation

- [x] 10.1 Actualizar ejemplos Swagger en controller
- [x] 10.2 Documentar en OpenSpec

## Verification

```bash
npm run lint     # ✅ Pass
npm test       # ✅ 43/43 Pass
docker compose exec api-user npm run build  # ✅ Pass
```