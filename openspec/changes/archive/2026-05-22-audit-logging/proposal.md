# Proposal: Audit Logging

## Intent

Add structured audit logging — HTTP-level automatic request audit plus business-level event-driven logging — giving every critical action an immutable trail (who, what, when, from where, result).

## Scope

### In Scope
- Global HTTP interceptor capturing IP, user-agent, endpoint, status, duration for mutations (POST/PUT/PATCH/DELETE) by default; GETs only in `AUDIT_LEVEL=verbose`
- `AUDIT_LEVEL` env var with three tiers: `minimal` (auth only), `standard` (mutations — default), `verbose` (all requests)
- `@AuditAction()` decorator on service methods for business context (before/after values)
- `AuditLog` MongoDB collection with TTL index for configurable retention (default 30 days)
- `nestjs-cls` activation for request context propagation
- Sensitive data redaction (passwords, tokens, authorization headers)
- Env toggle (`AUDIT_ENABLED`) to disable audit per environment
- Admin-only query/filter endpoint for audit log retrieval

### Out of Scope
- Audit log export/archival jobs
- Real-time audit dashboard
- Non-HTTP operations (seeds, CLI, scheduled tasks)
- GDPR right-to-erasure integration (deferred to retention policy)

## Capabilities

### New Capabilities
- `audit-logging`: Structured audit trail with HTTP context (who, IP, endpoint, status, duration) plus business context (action, before/after values) persisted to `audit_logs` collection.

### Modified Capabilities
None.

## Approach

**Hybrid: Interceptor + Event-driven** — recommended from exploration.

**Layer 1 — Global interceptor**: Captures HTTP metadata for mutations (POST/PUT/PATCH/DELETE) by default, controlled by `AUDIT_LEVEL`. Zero controller changes. Uses `nestjs-cls` to propagate request context (correlation ID, user, IP) to the service layer.

**Layer 2 — `@AuditAction()` decorator + EventEmitter2**: Service methods decorated with `@AuditAction({ action, resource })` emit audit events with business context. `AuditListener` persists asynchronously — no response blocking.

Reuses existing patterns: EventEmitter2 (email), Guards (auth context), dedicated cross-cutting modules under `src/common/`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/common/audit/` | New | Module, service, entity, interceptor, decorator, listener, repository, DTOs, interfaces |
| `src/main.ts` | Modified | `nestjs-cls` init, register global interceptor |
| `src/config/` | Modified | Env vars: `AUDIT_ENABLED`, `AUDIT_RETENTION_DAYS`, `AUDIT_LEVEL` |
| `src/auth/auth.service.ts` | Modified | `@AuditAction()` on login, register, password-reset methods |
| `src/user/service/user.service.ts` | Modified | `@AuditAction()` on CRUD, toggle-active, unlock methods |
| `src/rbac/services/*.service.ts` | Modified | `@AuditAction()` on role/permission CRUD methods |
| `package.json` | No change | `nestjs-cls` and `@nestjs/event-emitter` already present |
| Existing tests | Modified | Update EventEmitter2 mocks for new audit events |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test failures from broken EventEmitter2 mocks | High | Isolate audit events; update mocks incrementally per module |
| Sensitive data leaked to audit logs | Med | Redaction list: `password`, `token`, `authorization` headers |
| Audit collection grows unbounded | Med | TTL index on `createdAt`; default `AUDIT_RETENTION_DAYS=30` |
| `nestjs-cls` misconfiguration | Low | Isolated CLS setup tests; verify correlation ID end-to-end |

## Rollback Plan

1. Set `AUDIT_ENABLED=false` — disables all audit writes instantly.
2. Remove global interceptor registration from `main.ts`.
3. Remove `@AuditAction()` decorators (no functional impact — decorator is inert without listener).
4. Drop `audit_logs` collection if retention not needed.
5. Optionally remove `nestjs-cls` setup (no other consumers exist yet).

## Dependencies

- `@nestjs/event-emitter` (present, already used for email)
- `nestjs-cls` (present in `package.json`, needs activation)
- `@nestjs/mongoose` (present, used for schema/entity)

## Success Criteria

- [ ] All mutation requests (POST/PUT/PATCH/DELETE) generate audit log entries by default (GETs excluded unless `AUDIT_LEVEL=verbose`)
- [ ] Critical auth events (login success/failure, password change) include business context
- [ ] User CRUD, role CRUD, permission CRUD operations audited with resource ID and changes
- [ ] Audit log entries queryable via admin endpoint (filter by user, action, date range)
- [ ] No sensitive fields (passwords, tokens) ever appear in audit log entries
- [ ] TTL index exists on `audit_logs`; old entries expire automatically
- [ ] All existing tests pass; new tests cover interceptor, listener, and service
