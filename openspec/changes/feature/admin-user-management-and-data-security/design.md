# Design: Admin User Management and Data Security

## Architecture

### Sistema de Roles

```
┌─────────────────────────────────────────────────────────────┐
│                      JwtAuthGuard                          │
│              (verifica JWT válido)                         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       RolesGuard                          │
│              (verifica rol === ADMIN)                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Controller    │
                    │  /admin/*     │
                    └───────────────┘
```

### Decorador @Roles()

```typescript
// Usage
@ApiTags('users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)  // ← Solo admins acceden
export class UserController {}
```

### RolesGuard Implementation

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [...]);
    
    const user = request.user;
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Access denied. Required role: ADMIN');
    }
    return true;
  }
}
```

## Entity Changes

### User Entity

```typescript
@Schema()
export class User extends Base {
  @Prop({ required: true })
  name: string;
  
  // ... otros campos ...
  
  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;
  
  @Prop({ default: false })  // ← Cambiado: false por defecto
  isActive: boolean;
}
```

## DTOs

### CreateUserDTO (Admin)

```typescript
export class CreateUserDTO {
  @IsNotEmpty()
  @IsString()
  name: string;
  
  // ... otros campos ...
  
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;  // ← Campo obligatorio
}
```

### Response DTOs

```typescript
// Admin endpoints (Full)
class UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

// Public endpoints (Limited)
class PublicUserDTO {
  name: string;
  lastName: string;
  email: string;
}
```

## isActive Logic

| Origin | Method | isActive |
|--------|--------|---------|
| Register | `authService.register()` | `false` |
| Admin | `userService.createWithRole()` | `true` |
| Seed | `userService.createWithRole()` | `true` |

## File Changes

| File | Change |
|------|--------|
| `src/auth/guards/roles.guard.ts` | Nuevo |
| `src/auth/decorators/roles.decorator.ts` | Nuevo |
| `src/user/entities/user.entity.ts` | isActive default: false |
| `src/user/dto/create-user.dto.ts` | Agregar campo role |
| `src/user/dto/user.dto.ts` | Agregar role, isActive |
| `src/user/controller/user.controller.ts` | Usar createWithRole, RolesGuard |
| `src/auth/auth.service.ts` | Simplificar AuthResponse |
| `src/database/seeds/seed-users.ts` | Usar createWithRole(isActive: true) |