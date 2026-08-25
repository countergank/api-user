# Proposal: Parameter Admin Endpoint (COU-143)

## Intent

Admin users need runtime parameter management via API. Currently parameters exist only in config (Redis + env overrides) with no admin UI or API. This change exposes GET /admin/parameters (list all, list by group) and PUT /admin/parameters/:key (update runtime value) with ADMIN-only access, strict rate limiting, audit logging, and dual validation (DTO + registry).

## Scope

### In Scope
- New `ParameterAdminModule` at `src/config/parameters/parameter-admin.module.ts`
- New `ParameterAdminController` with 3 endpoints (GET all, GET by group, PUT by key)
- New DTOs: `UpdateParameterDto`, `ParameterResponseDto`
- Extend `ParameterService` with `getAll()`, `getByGroup()`
- Extend `ParameterStore` with `getAll()`, `getByGroup()`
- ADMIN-only guards: `JwtAuthGuard` + `RolesGuard` + `@Roles(UserRole.ADMIN)`
- Stricter rate limiting via `@Throttle` with env-configurable limits
- `@AuditAction()` on PUT endpoint
- Dual validation: class-validator DTO + `ParameterRegistry.validate()`
- Env-overridden params return `isOverridden: true` in response
- 404 for unknown keys, 422 for validation failures, 409 for env-overridden keys

### Out of Scope
- Public parameter read endpoints (COU-182 covers public reads)
- Parameter creation/deletion via API (registry is static at startup)
- Bulk update endpoint
- Parameter history/audit UI
- TTL modification via API

## Capabilities

### New Capabilities
- `parameter-admin`: Admin API for runtime parameter management (list, get by group, update)

### Modified Capabilities
- None (existing `parameter-store` and `parameter-registry` specs remain unchanged — this adds admin endpoints only)

## Approach

### Architecture
- Dedicated `ParameterAdminModule` (lazy-loaded or eager) at `src/config/parameters/parameter-admin.module.ts`
- Controller at `src/config/parameters/parameter-admin.controller.ts`
- DTOs at `src/config/parameters/dto/`
- Extends existing `ParameterService` and `ParameterStore` (no new providers)

### File Structure
```
src/config/parameters/
├── parameter-admin.module.ts          # NEW
├── parameter-admin.controller.ts      # NEW
├── dto/
│   ├── update-parameter.dto.ts        # NEW
│   └── parameter-response.dto.ts      # NEW
├── parameter.service.ts               # MODIFY (+getAll, +getByGroup)
└── parameter.store.ts                 # MODIFY (+getAll, +getByGroup)
```

### Endpoints

| Method | Path | Guards | Rate Limit | Audit |
|--------|------|--------|------------|-------|
| GET | /admin/parameters | JwtAuthGuard, RolesGuard, @Roles(ADMIN) | THROTTLE_ADMIN_DEFAULT | No |
| GET | /admin/parameters/:group | JwtAuthGuard, RolesGuard, @Roles(ADMIN) | THROTTLE_ADMIN_DEFAULT | No |
| PUT | /admin/parameters/:key | JwtAuthGuard, RolesGuard, @Roles(ADMIN) | THROTTLE_ADMIN_STRICT | @AuditAction({ action: 'PARAMETER_UPDATE', resource: 'parameter' }) |

### Rate Limiting
- Admin defaults: `THROTTLE_ADMIN_TTL=60`, `THROTTLE_ADMIN_LIMIT=30` (stricter than public)
- PUT endpoint: `THROTTLE_ADMIN_STRICT_TTL=60`, `THROTTLE_ADMIN_STRICT_LIMIT=10`

### Validation Flow (PUT)
1. DTO validation (class-validator): key exists, value type matches registry
2. Registry validation: `ParameterRegistry.validate(key, value)` — runs custom validators
3. Env override check: if `configService.get(key)` exists → return 409 with `isOverridden: true`
4. Write to Redis via `ParameterStore.set()`

### Response Shape (ParameterResponseDto)
```typescript
{
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  group: string;
  ttl: number;
  default: string | number | boolean;
  isOverridden: boolean;  // true if env var overrides Redis value
}
```

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/config/parameters/` | New/Modified | New admin module, controller, DTOs; extend service & store |
| `src/config/parameters/parameter.module.ts` | Modified | Export ParameterService for admin module |
| `src/auth/guards/` | None | Reuse existing JwtAuthGuard, RolesGuard |
| `src/common/audit/` | None | Reuse @AuditAction decorator |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Env-overridden params silently ignored on PUT | Medium | Explicit 409 response with `isOverridden` flag |
| Rate limit too strict for admin operations | Low | Env-configurable limits (`THROTTLE_ADMIN_*`) |
| Redis unavailable during PUT | Low | Store falls back to L1 cache; returns 503 on total failure |
| Registry validation bypass via DTO only | Low | Dual validation enforced in service layer |

## Rollback Plan

1. Revert `parameter-admin.module.ts`, `parameter-admin.controller.ts`, `dto/` folder (delete new files)
2. Revert `parameter.service.ts` (remove `getAll`, `getByGroup`)
3. Revert `parameter.store.ts` (remove `getAll`, `getByGroup`)
4. Remove `ParameterAdminModule` import from `AppModule` or config module
5. No database migration needed (Redis keys unchanged)

## Dependencies

- Existing: `ParameterModule` (provides `ParameterService`, `ParameterStore`, `ParameterRegistry`)
- Existing: `AuthModule` (provides guards)
- Existing: `AuditModule` (provides `@AuditAction`)
- Env vars: `THROTTLE_ADMIN_TTL`, `THROTTLE_ADMIN_LIMIT`, `THROTTLE_ADMIN_STRICT_TTL`, `THROTTLE_ADMIN_STRICT_LIMIT`

## Success Criteria

- [ ] `GET /admin/parameters` returns all params with `isOverridden` flag (ADMIN only)
- [ ] `GET /admin/parameters/:group` returns filtered params (ADMIN only)
- [ ] `PUT /admin/parameters/:key` updates Redis value, returns updated param (ADMIN only)
- [ ] PUT returns 404 for unknown key, 422 for validation failure, 409 for env override
- [ ] Audit log entry created on successful PUT
- [ ] Rate limits enforced (stricter on PUT)
- [ ] Unit + e2e tests pass for all 3 endpoints

---

*Proposal generated via SDD sdd-propose skill. Topic: sdd/parameter-admin-endpoint/proposal*