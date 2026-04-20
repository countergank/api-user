# rbac Specification

## Overview

Sistema de roles y permisos (RBAC) con formato `{recurso}:{acción}`.

## Requirements

### F01 - Permission Entity
- Colección: permissions
- Fields: _id, name, description, category, isSystem, isActive
- Name format: {recurso}:{acción}
- Examples: user:create, user:read, timer:read, timer:write

### F02 - Role Entity
- Colección: roles
- Fields: _id, name, description, permissionIds, isSystem, isDefault

### F03 - Permissions List
- Endpoint: GET /permissions
- Headers: Authorization: Bearer {accessToken}
- Response: { permissions: [...] }
- MUST return 401 if not authenticated

### F04 - Roles List
- Endpoint: GET /roles
- Headers: Authorization: Bearer {accessToken}
- Response: { roles: [...] }
- MUST return 401 if not authenticated
- MUST return 403 if not admin

### F05 - Assign Permissions to Role
- Endpoint: PUT /roles/:roleId/permissions
- Headers: Authorization: Bearer {accessToken}
- Body: { permissionIds: [...] }
- Response: { updated role }
- MUST return 403 if not admin

### F06 - Default Roles (Seed)
- MUST create roles: admin, user, viewer
- admin: todos los permisos (*)
- user: permisos básicos (lectura)
- viewer: solo lectura

### F07 - Default Permissions (Seed)
- MUST create permissions base:
  - user:create, user:read, user:update, user:delete
  - timer:create, timer:read, timer:update, timer:delete
  - organization:read, organization:update
  - integration:read
  - statistics:read

## Acceptance Criteria

- [ ] Permission entity configurable
- [ ] Role entity con permisos
- [ ] GET /permissions lista permisos
- [ ] GET /roles lista roles (admin only)
- [ ] PUT /roles/:id/permissions asigna permisos
- [ ] Seeds crean roles y permisos por defecto