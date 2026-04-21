# Design: feature/roles-and-permissions

## Architecture Decisions

### AD-01: JWT Authentication Strategy
**Decision**: Use passport-jwt with @nestjs/passport

**Rationale**:
- @nestjs/passport es el estándar para NestJS
- passport-jwt es estable y bien mantenido
- Soporta refresh tokens
- Compatible con api-timegank (usa el mismo)

**Alternatives Considered**:
- Custom JWT implementation: Más кодо, menos probadо
- Session-based: No escalable para múltiples proyectos

---

### AD-02: Permission Format
**Decision**: Format `{recurso}:{acción}` con wildcard `*`

| Example | Description |
|---------|-------------|
| `user:create` | Create users |
| `user:read` | Read users |
| `timer:*` | All timer permissions |
| `*` | All permissions (admin only) |

**Rationale**:
- Formato compatible con api-timegank
- Flexible para nuevos recursos
- Easy to check: string startsWith

---

### AD-03: Role Storage
**Decision**: MongoDB collections (roles, permissions)

| Collection | Schema |
|------------|--------|
| users | Agregar role, permissions[] |
| roles | { name, permissionIds, isSystem } |
| permissions | { name, description, category, isSystem } |

**Rationale**:
- MongoDB nativo de la app
- Easy query con Mongoose
- Seeds pueden inicializar

---

### AD-04: Password Recovery
**Decision**: Token por email con expiry 24h

**Flow**:
1. User pide reset → genera token + expiry
2. Email con link → token en query param
3. User envía newPassword + token
4. Valida expiry → actualiza password

**Rationale**:
- Token en email es estándar
- 24h es razonable para expiry
- Más seguro que preguntas secretas

---

## File Structure

```
src/
├── auth/
│   ├── auth.module.ts           # Module
│   ├── auth.controller.ts     # Endpoints
│   ├── auth.service.ts       # Lógica
│   ├── strategies/
│   │   ├── jwt.strategy.ts   # JWT validation
│   │   └── local.strategy.ts # Local (email/pass)
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── permissions.guard.ts
│   ├── decorators/
│   │   ├── permissions.decorator.ts
│   │   └── roles.decorator.ts
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       └── reset-password.dto.ts
├── rbac/
│   ├── rbac.module.ts
│   ├── roles/
│   │   ├── role.entity.ts
│   │   └── role.service.ts
│   └── permissions/
│       ├── permission.entity.ts
│       └── permission.service.ts
├── user/
│   └── entities/
│       └── user.entity.ts    # MODIFIED - role, permissions
└── database/
    └── seeds/
        ├── seed-roles.ts
        ├── seed-permissions.ts
        └── seed-users.ts  # MODIFIED - assign roles
```

---

## Implementation Phases

### Phase 1: Foundation
1. Install dependencies
2. Modify User entity
3. Create Permission entity
4. Create Role entity

### Phase 2: Authentication
1. Auth module + controller
2. JWT strategy + guard
3. Register endpoint
4. Login endpoint

### Phase 3: Authorization
1. Permission and Role services
2. @RequirePermissions decorator
3. Permission guard

### Phase 4: Password Recovery
1. Forgot password endpoint
2. Reset password endpoint
3. Email service integration

### Phase 5: Seeds
1. seed-permissions.ts
2. seed-roles.ts
3. Update seed-users.ts

---

## Security Considerations

1. **JWT Secret**: En environment, no en código
2. **Password Hash**: Ya usa bcryptjs
3. **Token Expiry**: Access 15min, Refresh 7d
4. **Rate Limiting**: En login para prevenir brute force
5. **Audit Logs**: Registrar login y cambios de permisos

---

## Testing Strategy

1. **Unit**: Auth service, JWT strategy, guards
2. **Integration**: Endpoints con test user
3. **E2E**: Full flow register → login → access protected

---

## Open Questions

- [x] Usar passport-jwt? **Sí**
- [ ] Email service para recovery? **Usar mock para MVP**
- [ ] Rate limiting? **En Phase 5**
- [ ] Sessions múltiples? **No en MVP**

---
Created: 2026-04-20