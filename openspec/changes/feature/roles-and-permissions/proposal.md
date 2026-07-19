# Proposal: feature/roles-and-permissions

## Intent

Implementar sistema completo de autenticación y autorización con JWT, roles y permisos para api-user. 
 Actualmente NO existe sistema de auth — todos los endpoints están públicos. Se necesita una API robusta e 
 independiente que los proyectos consumidores (como api-timegank) se adapten a ella.

## Scope

### In Scope
- Registro de usuarios
- Login con JWT
- Recuperación de contraseña (token por email)
- Sistema de roles: admin, user, viewer
- Sistema de permisos con formato `{recurso}:{acción}`
- JWT Auth Guard
- Permission Guard (Decorador @RequirePermissions)
- Endpoints de perfil de usuario
- Seeds para roles, permisos y usuarios
- Migraciones

### Out of Scope
- Multi-factor authentication (2FA)
- Invitaciones a organizaciones
- Sesiones múltiples

## Capabilities

### New Capabilities
- auth-login: Autenticación con JWT
- auth-register: Registro de usuarios
- auth-forgot-password: Recuperación de contraseña
- rbac-system: Sistema de roles y permisos
- user-profile: Gestión de perfil de usuario

## Approach

Sistema de autenticación usando JWT con passport-jwt. Roles y permisos almacenados en MongoDB 
 con formato `{recurso}:{acción}`. Seeds para inicializar datos por defecto.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| src/user/entities/user.entity.ts | Modified | Agregar role y permissions |
| src/auth/ | New | Módulo de autenticación |
| src/rbac/ | New | Roles y permisos |
| src/database/seeds/ | Modified | Seeds para roles, permisos, users |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| JWT sin blacklist | Medium | Refresh token con rotación |
| Permisos hardcoded | Low | BD parametrizable |
| Migraciones complejas | Medium | seed-only para MVP |

## Rollback Plan

- Revertir cambios en User entity
- Eliminar módulos auth y rbac
- Restaurar seeds originales

## Dependencies

- @nestjs/passport + passport
- @nestjs/jwt
- passport-jwt
- class-validator + class-transformer

## Success Criteria

- [ ] Registro y login funcionando con JWT
- [ ] Roles y permisos en BD
- [ ] Guards aplicados en endpoints
- [ ] Seeds executing sin errores