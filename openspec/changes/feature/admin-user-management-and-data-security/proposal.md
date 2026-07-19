# Proposal: Admin User Management and Data Security

## What

Implementar gestión completa de usuarios desde panel administrativo con:

- Endpoint `POST /admin/users` para crear usuarios con rol obligatorio
- Protección de endpoints `/admin/*` con `RolesGuard` (solo rol admin)
- Cuentas creadas por admin/seed: `isActive: true`
- Cuentas registradas por usuario: `isActive: false` (requiere verificación email)
- Endpoints públicos (`/users/*`, `/auth/*`) NO devuelven datos sensibles

## Why

1. **Rol obligatorio al crear usuario**: El DBA necesita asignar un rol al crear cuentas
2. **Protección por rol**: Endpoints administrativos solo accesibles para admins
3. **Activación por email**: Registro público requiere verificación antes de activar cuenta
4. **Seguridad de datos**: Endpoints públicos no exponen información sensible

## Scope

### In scope
- Modificar `CreateUserDTO` para incluir campo `role` obligatorio
- Implementar `RolesGuard` y decorador `@Roles()`
- Aplicar `RolesGuard` a endpoints `/admin/*`
- Configurar `isActive: true` para admin/seed, `false` para register
- Eliminar datos sensibles de respuestas públicas

### Out of scope
- Implementación de verificación por email
- Sistema de olvido/reset password
- Panel administrativo web

## Risks

- Cambiar `isActive` default podría afectar existentes si no se hace backup
- Roles ya creados deberían sincronizar con permisos

## Rollback plan

- Revertir cambios en DTOs y entity
- Deshabilitar `RolesGuard` en controller
- Restaurar `isActive: true` default

## Affected modules

- `src/user/` — controllers, DTOs, entities
- `src/auth/` — guards, decorators, service
- `src/database/seeds/` — seed-users