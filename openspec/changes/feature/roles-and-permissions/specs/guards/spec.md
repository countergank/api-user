# guards Specification

## Overview

JWT Auth Guard y Permission Guard para protección de endpoints.

## Requirements

### F01 - JwtAuthGuard
- Extiende Passport Strategy
- Extrae token del header Authorization: Bearer {token}
- MUST return 401 si token missing o invalid
- MUST attach user al request

### F02 - JwtStrategy
- Extiende Passport Strategy
- Valida JWT con secret
- Busca usuario por id
- MUST return 401 si usuario no encontrado

### F03 - @RequirePermissions Decorator
- Uso: @RequirePermissions('user:read', 'user:write')
- Array de permisos requeridos
- ALL permisos requeridos (no ANY)
- Ejemplo: @RequirePermissions('timer:create')

### F04 - PermissionGuard
- Se ejecuta después de JwtAuthGuard
- Verifica usuario tiene permisos requeridos
- MUST return 403 si permisos insuficientes

### F05 - @Roles Decorator (Opcional)
- Uso: @Roles('admin')
- Verifica rol del usuario
- Ejemplo: @Roles('admin')

### F06 - Request User
- After JwtAuthGuard, request.user contiene:
  - id, email, userName, name, role, permissions

## Acceptance Criteria

- [ ] JwtAuthGuard protege endpoints
- [ ] JwtStrategy valida JWT
- [ ] @RequirePermissions funciona
- [ ] PermissionGuard retorna 403
- [ ] request.user tiene datos del usuario