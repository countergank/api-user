## Exploration: Audit Logging

### Current State

The codebase has **zero audit infrastructure**. What exists today:

- **Logging**: `CustomLogger` (extends NestJS `ConsoleLogger`) with NODE_ENV=test suppression. No structured logging. Services/controllers use it ad-hoc for error logging only.
- **Request tracing**: Fastify configured with `genReqId` using `hyperid().uuid` — unique IDs exist per request at the transport layer but are not propagated to application code or logs.
- **Events**: `@nestjs/event-emitter` is used for email side-effects (`user.registered`, `auth.forgot-password`, `auth.password-changed`, etc.) — this is the closest existing pattern to async audit.
- **CLS**: `nestjs-cls` is in `package.json` dependencies but **not used anywhere**. Available for context propagation.
- **Error handling**: Global `ErrorFilter` (extends `ExceptionFilter`) catches exceptions. No custom interceptors exist.
- **Guards**: `JwtAuthGuard`, `RolesGuard`, `PermissionGuard` — these already extract `request.user`.
- **Middleware**: `I18nMiddleware` exists (functional `NestMiddleware`).
- **Database**: MongoDB with Mongoose ODM. All schemas use `timestamps: true`. Existing schema patterns use `@nestjs/mongoose` decorators and separate entity files.

### Affected Areas

- `src/main.ts` — Fastify `genReqId` could be replaced/upgraded to propagate request IDs to app layer
- `src/common/logger.ts` — Current logger is too minimal; may need structured logging capabilities
- `src/auth/auth.service.ts` — Login, register, forgotPassword, resetPassword, verifyEmail, confirmEmailChange, resendVerification, refreshToken all need audit events
- `src/auth/auth.controller.ts` — HTTP-level audit (IP, user-agent, endpoint access)
- `src/user/service/user.service.ts` — CRUD operations: create, update, deleteUser, toggleActiveUser, unlockUser, requestEmailChange
- `src/user/controller/user.controller.ts` — Admin CRUD endpoints
- `src/user/controller/user-profile.controller.ts` — Profile update, changePassword, changeEmail
- `src/rbac/services/role.service.ts` — Role CRUD, permission updates
- `src/rbac/services/permission.service.ts` — Permission CRUD
- `src/rbac/controllers/role.controller.ts` — Role endpoints
- `src/rbac/controllers/permission.controller.ts` — Permission endpoints
- `src/app/controller/app.controller.ts` — Version endpoint (low priority)
- `src/common/` — New `audit/` module folder would go here (consistent with cross-cutting concerns like `i18n/`)
- `src/config/` — New env vars for audit enable/disable, retention policy

### Approaches

1. **Hybrid: Interceptor (HTTP-level) + Event-driven (Business-level)** — RECOMMENDED
   - **Description**: Two-layer approach: (A) A global NestJS interceptor captures HTTP request metadata (who, what, IP, user-agent, endpoint, status code, duration) automatically for every request. (B) A custom `@Audit()` decorator on service methods fires business-level events via `EventEmitter2` with before/after values, captured by an `AuditListener` that persists to a dedicated `audit_logs` MongoDB collection.
   - **Pros**:
     - Non-invasive: interceptor requires zero changes to existing controllers
     - Dual granularity: automatic coverage + targeted business context
     - Async writes via EventEmitter2 — no blocking the response
     - Already uses existing patterns (EventEmitter2, Guards)
     - `nestjs-cls` available for request context propagation between interceptor and service
   - **Cons**:
     - Two paths to maintain (interceptor + event emission)
     - Needs `nestjs-cls` setup for request context sharing
     - Business-level events still require manual `@Audit()` decorator additions
   - **Effort**: High (foundation work: CLS setup, interceptor, audit module, entity — ~full feature)

2. **Event-driven Dedicated Audit Module**
   - **Description**: Single approach using `@nestjs/event-emitter`. An `AuditModule` with its own `AuditService` and Mongoose schema (`AuditLog`). Services manually emit audit events after critical operations. An `AuditListener` handles persistence.
   - **Pros**:
     - Simple, follows existing pattern (same as email listeners)
     - Full control over what gets audited and when
     - Rich business context available at emission point
     - No CLS or interceptor complexity
   - **Cons**:
     - Manual emission in every service method — easy to miss things
     - No HTTP context (IP, user-agent) without additional plumbing
     - Team discipline required; no fallback "catch-all"
   - **Effort**: Medium (audit module, entity, service, listener, event types — no interceptor)

3. **Interceptor-only with Custom Decorator**
   - **Description**: A single NestJS interceptor that wraps controller methods. A `@Audit()` decorator on controller methods specifies what resource/action to log. The interceptor captures request/response, user, IP, and persists to MongoDB.
   - **Pros**:
     - Single path, single responsibility
     - Captures all HTTP-level data automatically (IP, user-agent, timing)
     - Minimal changes to existing code (just add decorators)
   - **Cons**:
     - No business context (before/after values of what changed)
     - Works at controller level — service-level details invisible
     - Harder to audit non-HTTP operations (seeds, system events)
   - **Effort**: Medium (interceptor, decorator, audit module, entity — similar to approach 2)

4. **Mongoose Plugin Approach**
   - **Description**: A Mongoose plugin on the `User` schema (and others) that hooks into `save`, `findOneAndUpdate`, `deleteOne` to record data changes into a separate `audit_logs` collection.
   - **Pros**:
     - Catches ALL data changes regardless of code path
     - Works at database level — cannot be circumvented by service code
     - Rich data about what changed (diff of document before/after)
   - **Cons**:
     - No HTTP context (who initiated, from what IP, what user-agent)
     - No business context (what action concept — just data mutation)
     - Couples audit to Mongoose lifecycle — hard to disable/configure
     - Extra DB writes on every mutation (performance concern)
   - **Effort**: Medium (plugin development, schema-level hooks, separate collection)

### Recommendation

**Approach 1 (Hybrid: Interceptor + Event-driven)** — It's the most robust fit for this codebase because:

1. The **interceptor layer** provides automatic baseline coverage for all HTTP endpoints with zero code changes — every request gets at least a minimal audit trail (who, what, when, IP).
2. The **event-driven layer** using existing `EventEmitter2` patterns provides rich business context for critical operations (login success/failure, password change, role/permission changes) without blocking the request.
3. `nestjs-cls` is already in the dependency tree and solves the exact problem of sharing request context (correlation ID, user info, IP) between the interceptor and the service layer without parameter passing.
4. It follows existing architectural patterns: EventEmitter2 (email), Guards (auth), dedicated modules (i18n, email are both cross-cutting modules under `common/` or standalone).

The recommended architecture:

```
src/common/audit/
├── audit.module.ts          — @Global() AuditModule
├── audit.service.ts         — Core audit service (receives + persists events)
├── audit-log.entity.ts      — Mongoose schema for audit_logs collection
├── audit-log.repository.ts  — Mongoose CRUD for audit logs (query/retention)
├── audit.interceptor.ts     — Global interceptor for HTTP-level audit
├── audit.decorator.ts       — @AuditAction() decorator for business-level events
├── audit.listener.ts        — Event listener for audit events from services
├── dto/
│   └── audit-filter.dto.ts  — Query DTO for audit log queries
└── interfaces/
    ├── audit-event.interface.ts
    └── audit-action.enum.ts
```

### Risks

- **Performance**: The interceptor does synchronous processing per request and aysnc DB writes. Need to ensure the interceptor is lightweight (no heavy serialization/sanitization on the hot path). Async writes via EventEmitter2 mitigate response-time impact.
- **Data volume**: Audit logs can grow fast. Need a TTL index on the `audit_logs` collection, a retention config/env var, and optionally a cleanup job.
- **Sensitive data**: The interceptor must NEVER log passwords, tokens, or `authorization` headers. Need an explicit redaction list (Fastify already has `redact: ['headers.authorization']` — extend this).
- **CLS setup**: `nestjs-cls` requires wrapping the NestJS app with `ClsModule` and `ClsGuard`/middleware. This adds a runtime dependency that must be tested thoroughly.
- **Tests**: Need to write new unit tests for the interceptor, service, listener, and entity. The `@nestjs/event-emitter` testing pattern already exists in the codebase.
- **Existing tests**: Current service tests (auth, user) mock the EventEmitter2. Adding audit event emissions breaks existing mocks — all service tests need updating to mock the new audit events.

### Ready for Proposal

**Yes** — The exploration is thorough enough to move to the proposal phase. The hybrid approach (Interceptor + Event-driven) is well-supported by existing patterns in the codebase. The orchestrator should:

1. Create the proposal with scope: "Add audit logging module with HTTP-level interceptor and business-level event-driven logging"
2. Reference this exploration for approach rationale
3. Flag the key risks: nestjs-cls initialization, redaction of sensitive data, TTL index on audit_logs, and test updates
