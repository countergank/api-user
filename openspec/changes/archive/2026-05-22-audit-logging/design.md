# Design: Audit Logging

## Technical Approach

Hybrid two-layer audit: a global **NestJS interceptor** captures HTTP metadata (IP, user-agent, method, path, status, duration) for mutations (POST/PUT/PATCH/DELETE) by default — controlled by `AUDIT_LEVEL` — while a **`@AuditAction()` decorator + EventEmitter2** adds business context (before/after values) on critical service methods. Both layers emit through EventEmitter2 to a single `AuditListener` that persists to `audit_logs` collection asynchronously. `nestjs-cls` propagates request context (correlation ID, user, IP) from the interceptor to the service layer. All existing patterns are reused: Entity naming (`.entity.ts`), ModuleMocker-based tests, `CustomLogger`, `@OnEvent()` listeners, `RolesGuard`-protected admin endpoints.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Interceptor vs middleware | NestJS `NestInterceptor` | Fastify middleware | Interceptor has access to response stream, status code, and execution context (Reflector metadata). Matches the NestJS pattern for cross-cutting concerns. |
| EventEmitter2 vs direct DB write | `EventEmitter2` async emit | `await Model.create()` in interceptor | Async fire-and-forget prevents audit from blocking HTTP response. Reuses existing pattern (email module). |
| Separate collection vs embedded | Dedicated `audit_logs` collection | Embedded audit array on User doc | Independent TTL index, unbounded growth isolation, no document-size ceiling, cross-resource queries (not just users). |
| TTL index vs cron cleanup | MongoDB TTL index on `createdAt` | `@Cron()` decorated cleanup job | Zero code maintenance, built-in MongoDB mechanism, no scheduler dependency. TTL is MongoDB's designed solution for time-based expiration. |
| `nestjs-cls` vs manual param passing | `ClsModule.forRoot({ global: true })` | Pass `req` through every service call | CLS is already in `package.json`. Avoids polluting every method signature with request context. Single setup in AppModule. |
| Entity naming: `.entity.ts` vs `.schema.ts` | Follow codebase convention: `audit-log.entity.ts` | `audit-log.schema.ts` | Consistency with existing 6 entities (User, EmailLog, EmailTemplate, Role, Permission, I18nTranslation) — all use `.entity.ts`. |
| `AUDIT_LEVEL` env var vs per-endpoint toggles | `AUDIT_LEVEL` env var with three tiers (`minimal`, `standard`, `verbose`) | `@SkipAudit()` decorator per controller | Single env var scales across all modules with zero annotation boilerplate. Three tiers cover all real-world use cases. Default `standard` (mutations only) cuts ~70% of audit volume vs auditing GETs. |

## Data Flow

```
HTTP Request
     │
     ▼
┌─────────────────────┐    reads CLS     ┌──────────────┐
│  AuditInterceptor   │◄───────────────│  ClsService  │
│  (mutations by       │                  │  (user, corr │
│   default per        │                  │   id, IP)    │
│   AUDIT_LEVEL)       │                  └──────────────┘
│  captures: IP, UA,   │
│  method, path,       │
│  status, duration   │
└──────┬──────────────┘
       │ emit('audit.http.request', payload)
       ▼
┌─────────────────────┐                  ┌──────────────────┐
│   EventEmitter2     │◄────────────────│  Service methods  │
│   (in-process bus)  │  emit('audit.*')│  @AuditAction()   │
└──────┬──────────────┘  decorated       │  decorator reads  │
       │                 methods emit    │  CLS for user/    │
       ▼                 business ctx    │  correlationId    │
┌─────────────────────┐                  └──────────────────┘
│   AuditListener     │
│   @OnEvent('audit.*')│──── Redaction ────► audit_logs (MongoDB)
└─────────────────────┘                    TTL index on createdAt
```

## Module Structure

```
src/common/audit/
├── audit.module.ts           # @Global() module, imports ClsModule, MongooseModule
├── entities/
│   └── audit-log.entity.ts   # Mongoose schema: AuditLog with TTL index
├── audit.interceptor.ts      # Global NestInterceptor: HTTP metadata capture
├── audit.decorator.ts        # @AuditAction(config) parameterized decorator
├── audit.listener.ts         # @OnEvent('audit.*') → persists AuditLog, applies redaction
├── audit.service.ts          # Query service for admin endpoint (findPaginated)
├── audit-log.repository.ts   # Mongoose CRUD (create, findPaginated with filters)
├── audit.controller.ts       # GET /audit-logs (admin-only, guarded)
├── constants/
│   └── audit.events.ts       # Event name constants (matching email.events.ts pattern)
├── dto/
│   ├── audit-log-filter.dto.ts      # Query params: userId, action, resource, from, to, ip, page, limit
│   ├── audit-log-response.dto.ts    # Single audit log response shape
│   └── paginated-audit-log-response.dto.ts
└── interfaces/
    ├── audit-action-config.interface.ts   # @AuditAction() config shape
    └── audit-event-payload.interface.ts   # Event payload shape
```

## AuditLog Entity — Key Fields

```typescript
@Schema({ timestamps: true, versionKey: false })
export class AuditLog extends Base {
  @Prop({ required: true, index: true })  correlationId: string;
  @Prop({ index: true })                  userId?: string;          // 'anonymous' if unauthenticated
  @Prop({ required: true, index: true })  action: string;           // 'http.request' | 'user.create' ...
  @Prop({ required: true, index: true })  resource: string;         // 'http' | 'user' | 'role' ...
  @Prop({ index: true })                  resourceId?: string;
  @Prop()                                 ipAddress?: string;
  @Prop()                                 userAgent?: string;
  @Prop()                                 httpMethod?: string;
  @Prop()                                 endpoint?: string;
  @Prop()                                 statusCode?: number;
  @Prop()                                 duration?: number;        // ms
  @Prop({ type: Object })                 businessContext?: { before?: any; after?: any };
  @Prop({ type: Object })                 metadata?: Record<string, unknown>;
  @Prop({ type: Date, default: Date.now, index: { expireAfterSeconds: 0 } })
                                          createdAt: Date;          // TTL index applied at schema level
}
```

TTL index set dynamically in `AuditModule.onModuleInit()` via `auditLogModel.collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: retentionDays * 86400 })`, reading `AUDIT_RETENTION_DAYS` from `ConfigService`.

## Decorator Pattern

`@AuditAction(config)` uses NestJS `SetMetadata` — same pattern as existing `@Roles()` decorator. An `AuditAspectInterceptor` (or the service wrapper) reads metadata via `Reflector` and emits events.

```typescript
// audit.decorator.ts
export const AUDIT_ACTION_KEY = 'audit:action';

export interface AuditActionConfig {
  action: string;           // 'user.create', 'auth.login.failure'
  resource: string;         // 'user', 'auth'
  getResourceId?: (result: any, args: any[]) => string;
  getBefore?: (...args: any[]) => any;
  getAfter?: (result: any) => any;
}

export const AuditAction = (config: AuditActionConfig) =>
  SetMetadata(AUDIT_ACTION_KEY, config);
```

Usage decorates the SERVICE method (not controller):

```typescript
@AuditAction({ action: 'user.create', resource: 'user', getResourceId: (result) => result._id, getAfter: (result) => result })
async create(dto: CreateUserDTO): Promise<User> { ... }
```

## Sensitive Data Redaction

`AuditListener` applies `redactSensitiveFields()` before persisting. Recursive: scans objects for keys matching configurable list `['password', 'token', 'authorization', 'refreshToken', 'resetPasswordToken', 'emailVerificationToken', 'pendingEmailToken']`. Matches via case-insensitive `includes('token')` or exact match. Replaces values with `'[REDACTED]'`. Fastify's existing `redact: ['headers.authorization']` in the adapter provides first-line defense; this is defense-in-depth for business context embedded in events.

## Admin Endpoint

`GET /audit-logs` — controller at `src/common/audit/audit.controller.ts`:
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.ADMIN)` — same pattern as `EmailController`
- `@ApiTags('admin')` + `@ApiBearerAuth()`
- Query params via `AuditLogFilterDTO` (class-validator): `userId`, `action`, `resource`, `from`/`to` (ISO dates), `ip`, `page` (default 1), `limit` (default 20, max 100)
- Returns `PaginatedAuditLogResponseDTO` with `data`, `total`, `page`, `limit`

## CLS Integration

```typescript
// app.module.ts — add to imports
ClsModule.forRoot({ global: true, middleware: { mount: true } }),
AuditModule,

// AuditInterceptor reads from CLS:
const cls = this.clsService;
const correlationId = cls.getId();              // auto-generated by ClsModule
const userId = cls.get('userId') || 'anonymous'; // set by JwtAuthGuard extension
const ip = cls.get('ip');                        // set by interceptor or middleware
```

JWT guard must set `cls.set('userId', user.id)` after authentication. This is a minimal change: extend `JwtAuthGuard.handleRequest()` or add a `ClsGuard` step.

## AUDIT_LEVEL Configuration

The `AUDIT_LEVEL` env var controls which HTTP requests the global interceptor captures. Business-level `@AuditAction()` events are unaffected — they only check `AUDIT_ENABLED`.

| Level | Value | Behavior |
|-------|-------|----------|
| `minimal` | `'minimal'` | Only auth-related endpoints are audited: login, register, forgot-password, reset-password, verify-email, confirm-email-change, refresh-token. All other requests bypass the interceptor entirely. |
| `standard` | `'standard'` | All mutations (POST, PUT, PATCH, DELETE) are audited. GET and HEAD requests are excluded. **Default.** Cuts ~70% of audit volume vs auditing all requests. |
| `verbose` | `'verbose'` | Every HTTP request is audited, including GETs. Full coverage for debugging or high-security environments. |

Interceptor logic (pseudocode):

```typescript
// Inside AuditInterceptor.intercept()
const level = this.configService.get('AUDIT_LEVEL', 'standard');

const shouldAudit = level === 'verbose'
  || (level === 'standard' && ['POST','PUT','PATCH','DELETE'].includes(request.method))
  || (level === 'minimal' && AUTH_ENDPOINTS.has(request.url));

if (!shouldAudit) return next.handle();
// ... capture metadata and emit audit.http.request
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/common/audit/` (entire tree) | Create | New module with entity, interceptor, decorator, listener, service, repository, controller, DTOs, interfaces, constants |
| `src/app/app.module.ts` | Modify | Import `ClsModule.forRoot({ global: true })` + `AuditModule` |
| `src/main.ts` | Modify | Register `AuditInterceptor` as global interceptor via `APP_INTERCEPTOR` |
| `src/config/env.validation.ts` | Modify | Add `AUDIT_ENABLED`, `AUDIT_RETENTION_DAYS`, `AUDIT_LEVEL` validation |
| `src/auth/guards/jwt-auth.guard.ts` | Modify | Set `cls.set('userId', user.id)` in `handleRequest()` |
| `src/auth/auth.service.ts` | Modify | Add `@AuditAction()` on login, register, forgotPassword, resetPassword, verifyEmail, confirmEmailChange, refreshToken |
| `src/user/service/user.service.ts` | Modify | Add `@AuditAction()` on create, updateUser, deleteUser, toggleActiveUser, unlockUser, requestEmailChange |
| `src/rbac/services/role.service.ts` | Modify | Add `@AuditAction()` on CRUD methods |
| `src/rbac/services/permission.service.ts` | Modify | Add `@AuditAction()` on CRUD methods |
| Existing service tests (`*.spec.ts`) | Modify | Update EventEmitter2 mocks for new `audit.*` emissions |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit — Interceptor | Captures IP, method, path, status, duration; skips when disabled; respects AUDIT_LEVEL (excludes GETs in standard mode, only auth endpoints in minimal, all in verbose); attaches correlationId | `Test.createTestingModule` + mock `ExecutionContext`, `CallHandler`, `ClsService`. Use existing `Mock(token)` pattern. |
| Unit — Listener | Persists via repository, applies redaction, handles `AUDIT_ENABLED=false` | Mock `AuditLogRepository`, assert `create()` called with redacted payload. |
| Unit — Decorator | Verifies metadata is set correctly via `Reflector` | Standalone test: apply decorator to test class, read metadata. |
| Unit — Repository | `findPaginated` applies all filter combinations correctly | In-memory Mongo via `mongodb-memory-server` (existing `createConnection` helper). |
| Integration — Service | `findPaginated` with real filters | Full module test with real DB. |
| Integration — Endpoint | GET /audit-logs returns 403 for non-admin, 200 + results for admin | E2E test via `createTestApp()` helper. |
| Existing tests | All service tests still pass after EventEmitter2 mock update | Add `audit.*` to mock expectations in existing spec files. |

## Open Questions

None — all blocked decisions are resolved in the architecture decisions table above.
