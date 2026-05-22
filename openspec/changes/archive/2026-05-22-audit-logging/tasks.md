# Audit Logging - Implementation Tasks

## Executive Summary

**Total Tasks**: 24 tasks across 7 phases
**Estimated Total Lines**: ~1,450-1,850 lines changed
**New Files**: 15 files in `src/common/audit/`
**Modified Files**: 8 existing files (app.module.ts, main.ts, env.validation.ts, jwt-auth.guard.ts, auth.service.ts, user.service.ts, role.service.ts, permission.service.ts)
**Review Workload**: HIGH - Exceeds 400 lines significantly. Given `exception-ok` delivery strategy, single PR is acceptable, but consider splitting into 2-3 chained PRs for review quality:
  - PR 1 (Foundation + Core): Phases 1-2 (~600 lines)
  - PR 2 (Interceptor + Decorator): Phases 3-4 (~500 lines)
  - PR 3 (Integration + Admin + Tests): Phases 5-7 (~600 lines)

---

## Phase 1: Foundation (Tasks 1.1-1.4)

### Task 1.1: Add audit environment variables validation
**Description**: Add `AUDIT_ENABLED`, `AUDIT_RETENTION_DAYS`, and `AUDIT_LEVEL` to environment validation schema with proper type checking and default values.
**Spec Reference**: AL-07
**Estimated Lines**: 40 lines
**Dependencies**: None
**Acceptance Criteria**:
- [x] `AUDIT_ENABLED` validated as boolean (default: true)
- [x] `AUDIT_RETENTION_DAYS` validated as positive integer (default: 30)
- [x] `AUDIT_LEVEL` validated as enum: 'minimal' | 'standard' | 'verbose' (default: 'standard')
- [x] Application fails to start on invalid values
- [x] Validation error messages are descriptive
**Files Affected**:
- `src/config/env.validation.ts` - Modify

---

### Task 1.2: Create AuditLog entity with TTL index
**Description**: Create Mongoose entity for audit logs with all required fields and dynamic TTL index configuration.
**Spec Reference**: AL-05
**Estimated Lines**: 80 lines
**Dependencies**: 1.1
**Acceptance Criteria**:
- [x] Entity extends Base class (following codebase convention)
- [x] All fields from design.md implemented: correlationId, userId, action, resource, resourceId, ipAddress, userAgent, httpMethod, endpoint, statusCode, duration, businessContext, metadata, createdAt
- [x] Proper indexes on correlationId, userId, action, resource
- [x] TTL index configured dynamically via `onModuleInit()` using `AUDIT_RETENTION_DAYS`
- [x] File named `audit-log.entity.ts` (following `.entity.ts` convention)
**Files Affected**:
- `src/common/audit/entities/audit-log.entity.ts` - Create

---

### Task 1.3: Create audit event constants and interfaces
**Description**: Define event name constants and TypeScript interfaces for audit action configuration and event payloads.
**Spec Reference**: AL-02
**Estimated Lines**: 50 lines
**Dependencies**: None
**Acceptance Criteria**:
- [x] Event constants follow pattern from `email.events.ts`: `AUDIT_HTTP_REQUEST`, `AUDIT_BUSINESS_ACTION`
- [x] `AuditActionConfig` interface with action, resource, getResourceId, getBefore, getAfter
- [x] `AuditEventPayload` interface with all event data fields
- [x] Interfaces exported for use across modules
**Files Affected**:
- `src/common/audit/constants/audit.events.ts` - Create
- `src/common/audit/interfaces/audit-action-config.interface.ts` - Create
- `src/common/audit/interfaces/audit-event-payload.interface.ts` - Create

---

### Task 1.4: Create audit module with CLS integration
**Description**: Create global audit module importing ClsModule, MongooseModule for AuditLog entity, and providing all audit services.
**Spec Reference**: AL-07, AL-08
**Estimated Lines**: 60 lines
**Dependencies**: 1.2, 1.3
**Acceptance Criteria**:
- [x] Module decorated with `@Global()` and `@Module()`
- [x] Imports `ClsModule` (already configured globally in app.module.ts)
- [x] Imports `MongooseModule.forFeature(AuditLog, 'audit_logs')`
- [x] Provides: AuditLogRepository, AuditService, AuditListener, AuditInterceptor
- [x] Exports: AuditService, AuditLogRepository
- [x] Implements `OnModuleInit` to create TTL index dynamically
**Files Affected**:
- `src/common/audit/audit.module.ts` - Create

---

## Phase 2: Core Audit Infrastructure (Tasks 2.1-2.4)

### Task 2.1: Create audit log repository
**Description**: Create Mongoose repository for audit log CRUD operations with pagination and filtering support.
**Spec Reference**: AL-04, AL-08
**Estimated Lines**: 100 lines
**Dependencies**: 1.2
**Acceptance Criteria**:
- [x] Injectable repository class following existing pattern (e.g., `user.repository.ts`)
- [x] `create()` method for persisting audit logs
- [x] `findPaginated()` method with filters: userId, action, resource, date range (from/to), ipAddress
- [x] Pagination support with page/limit parameters
- [x] Proper typing with TypeScript interfaces
**Files Affected**:
- `src/common/audit/audit-log.repository.ts` - Create

---

### Task 2.2: Create audit service
**Description**: Create business logic service for audit log queries used by admin controller.
**Spec Reference**: AL-04
**Estimated Lines**: 80 lines
**Dependencies**: 2.1
**Acceptance Criteria**:
- [x] Injectable service class
- [x] `findPaginated()` method delegating to repository
- [x] Input validation for filter DTO
- [x] Returns properly formatted pagination response
- [x] Unit tests with mocked repository
**Files Affected**:
- `src/common/audit/audit.service.ts` - Create

---

### Task 2.3: Create audit listener with redaction
**Description**: Create event listener that subscribes to `audit.*` events and persists audit logs with sensitive data redaction.
**Spec Reference**: AL-03, AL-08
**Estimated Lines**: 120 lines
**Dependencies**: 1.3, 2.1
**Acceptance Criteria**:
- [x] Listener class with `@OnEvent('audit.*')` decorator
- [x] Checks `AUDIT_ENABLED` before persisting
- [x] Implements `redactSensitiveFields()` recursive function
- [x] Redacts: password, token, authorization, refreshToken, resetPasswordToken, emailVerificationToken, pendingEmailToken
- [x] Redaction uses case-insensitive matching for 'token' substring
- [x] Replaces sensitive values with `'[REDACTED]'`
- [x] Persists via `AuditLogRepository.create()`
- [x] Async fire-and-forget (does not block)
**Files Affected**:
- `src/common/audit/audit.listener.ts` - Create

---

### Task 2.4: Create audit module unit tests
**Description**: Write unit tests for repository, service, and listener components.
**Spec Reference**: AL-03, AL-08
**Estimated Lines**: 150 lines
**Dependencies**: 2.1, 2.2, 2.3
**Acceptance Criteria**:
- [x] Repository tests: `create()` and `findPaginated()` with filters
- [x] Service tests: delegation to repository
- [x] Listener tests: redaction applied, AUDIT_ENABLED check, event payload handling
- [x] Uses ModuleMocker pattern from codebase
- [x] All tests pass with coverage
**Files Affected**:
- `src/common/audit/audit-log.repository.spec.ts` - Create
- `src/common/audit/audit.service.spec.ts` - Create
- `src/common/audit/audit.listener.spec.ts` - Create

---

## Phase 3: HTTP Interceptor (Tasks 3.1-3.3)

### Task 3.1: Create AuditInterceptor with AUDIT_LEVEL logic
**Description**: Create global NestJS interceptor that captures HTTP metadata for mutations (POST/PUT/PATCH/DELETE) based on AUDIT_LEVEL configuration.
**Spec Reference**: AL-01, AL-09
**Estimated Lines**: 150 lines
**Dependencies**: 1.3, 1.4
**Acceptance Criteria**:
- [x] Implements `NestInterceptor` interface
- [x] Reads `AUDIT_LEVEL` from ConfigService
- [x] Implements three-tier logic:
  - `minimal`: Only auth endpoints (login, register, forgot-password, reset-password, verify-email, confirm-email-change, refresh-token)
  - `standard`: All mutations (POST/PUT/PATCH/DELETE) - DEFAULT
  - `verbose`: All requests including GETs
- [x] Captures: IP, user-agent, method, path, status code, duration, correlationId
- [x] Reads userId from CLS (or 'anonymous' if not set)
- [x] Emits `audit.http.request` event via EventEmitter2
- [x] Skips audit when `AUDIT_ENABLED=false`
- [x] Unit tests for all AUDIT_LEVEL scenarios
**Files Affected**:
- `src/common/audit/audit.interceptor.ts` - Create
- `src/common/audit/audit.interceptor.spec.ts` - Create

---

### Task 3.2: Register global interceptor and CLS in app.module.ts
**Description**: Register AuditInterceptor as global interceptor via APP_INTERCEPTOR and ensure ClsModule is configured.
**Spec Reference**: AL-01
**Estimated Lines**: 20 lines
**Dependencies**: 3.1
**Acceptance Criteria**:
- [x] `ClsModule.forRoot({ global: true, middleware: { mount: true } })` in AppModule imports
- [x] `AuditModule` imported in AppModule
- [x] `APP_INTERCEPTOR` provider registered with `AuditInterceptor`
- [x] Provider uses `useClass: AuditInterceptor`
**Files Affected**:
- `src/app/app.module.ts` - Modify

---

### Task 3.3: Update JwtAuthGuard to set CLS userId
**Description**: Extend JwtAuthGuard to set user ID in CLS context after successful authentication.
**Spec Reference**: AL-01
**Estimated Lines**: 15 lines
**Dependencies**: 3.2
**Acceptance Criteria**:
- [x] Inject `ClsService` in JwtAuthGuard
- [x] In `handleRequest()` method, after user validation: `cls.set('userId', user.id)`
- [x] Also set IP address: `cls.set('ip', request.ip)`
- [x] Does not break existing auth flow
- [x] Unit tests updated
**Files Affected**:
- `src/auth/guards/jwt-auth.guard.ts` - Modify

---

## Phase 4: Business Decorator (Tasks 4.1-4.2)

### Task 4.1: Create @AuditAction() decorator
**Description**: Create parameterized decorator using NestJS `SetMetadata` for marking service methods that require business-level audit logging.
**Spec Reference**: AL-02
**Estimated Lines**: 40 lines
**Dependencies**: 1.3
**Acceptance Criteria**:
- [x] Uses `SetMetadata(AUDIT_ACTION_KEY, config)` pattern (same as `@Roles()` decorator)
- [x] Accepts `AuditActionConfig` parameter
- [x] Exports `AUDIT_ACTION_KEY` constant for metadata reflection
- [x] Decorator can be applied to service methods
- [x] TypeScript types properly exported
**Files Affected**:
- `src/common/audit/audit.decorator.ts` - Create

---

### Task 4.2: Create AuditAspectInterceptor for decorator metadata extraction
**Description**: Create interceptor or service wrapper that reads `@AuditAction()` metadata via Reflector and emits business audit events.
**Spec Reference**: AL-02
**Estimated Lines**: 100 lines
**Dependencies**: 4.1
**Acceptance Criteria**:
- [x] Implements `NestInterceptor` or uses aspect-oriented approach
- [x] Reads metadata via `Reflector.get(AUDIT_ACTION_KEY, context.getHandler())`
- [x] Executes target method and captures result
- [x] Calls `getResourceId(result, args)` if provided
- [x] Calls `getBefore(...args)` and `getAfter(result)` if provided
- [x] Emits `audit.business.action` event with full context
- [x] Reads userId and correlationId from CLS
- [x] Checks `AUDIT_ENABLED` before emitting
- [x] Unit tests for metadata extraction and event emission
**Files Affected**:
- `src/common/audit/audit-aspect.interceptor.ts` - Create
- `src/common/audit/audit-aspect.interceptor.spec.ts` - Create

---

## Phase 5: Service Integration (Tasks 5.1-5.3)

### Task 5.1: Add @AuditAction() to auth.service.ts
**Description**: Decorate authentication service methods with `@AuditAction()` for business-level audit logging.
**Spec Reference**: AL-02
**Estimated Lines**: 60 lines (modifications)
**Dependencies**: 4.1, 4.2
**Acceptance Criteria**:
- [x] `login()` - action: 'auth.login', resource: 'auth', includes success/failure status
- [x] `register()` - action: 'auth.register', resource: 'auth', getResourceId returns new user ID
- [x] `forgotPassword()` - action: 'auth.forgot-password', resource: 'auth'
- [x] `resetPassword()` - action: 'auth.reset-password', resource: 'auth'
- [x] `verifyEmail()` - action: 'auth.verify-email', resource: 'auth'
- [x] `confirmEmailChange()` - action: 'auth.confirm-email-change', resource: 'auth'
- [x] `refreshToken()` - action: 'auth.refresh-token', resource: 'auth'
- [x] Sensitive data (passwords, tokens) redacted via listener
- [x] Import audit module and decorator
**Files Affected**:
- `src/auth/auth.service.ts` - Modify

---

### Task 5.2: Add @AuditAction() to user.service.ts
**Description**: Decorate user service CRUD and administrative methods with `@AuditAction()`.
**Spec Reference**: AL-02
**Estimated Lines**: 80 lines (modifications)
**Dependencies**: 4.1, 4.2
**Acceptance Criteria**:
- [x] `create()` - action: 'user.create', resource: 'user', getResourceId, getAfter
- [x] `updateUser()` - action: 'user.update', resource: 'user', getBefore, getAfter
- [x] `deleteUser()` - action: 'user.delete', resource: 'user', getBefore
- [x] `toggleActiveUser()` - action: 'user.toggle-active', resource: 'user', getBefore, getAfter
- [x] `unlockUser()` - action: 'user.unlock', resource: 'user'
- [x] `requestEmailChange()` - action: 'user.request-email-change', resource: 'user'
- [x] Import audit module and decorator
- [x] Existing unit tests updated for new event emissions
**Files Affected**:
- `src/user/service/user.service.ts` - Modify

---

### Task 5.3: Add @AuditAction() to RBAC services
**Description**: Decorate role and permission service methods with `@AuditAction()` for admin action auditing.
**Spec Reference**: AL-02
**Estimated Lines**: 70 lines (modifications)
**Dependencies**: 4.1, 4.2
**Acceptance Criteria**:
- [x] `role.service.ts`: create, updatePermissions methods decorated
- [x] `permission.service.ts`: create method decorated
- [x] All actions include resource type ('role' or 'permission')
- [x] getResourceId returns created/modified resource ID
- [x] getBefore/getAfter for mutations
- [x] Import audit module and decorator
- [x] Existing unit tests updated
**Files Affected**:
- `src/rbac/services/role.service.ts` - Modify
- `src/rbac/services/permission.service.ts` - Modify

---

## Phase 6: Admin Query Endpoint (Tasks 6.1-6.3)

### Task 6.1: Create DTOs for audit log query
**Description**: Create request/response DTOs with class-validator for admin audit log endpoint.
**Spec Reference**: AL-04
**Estimated Lines**: 80 lines
**Dependencies**: None
**Acceptance Criteria**:
- [x] `AuditLogFilterDTO` with: userId, action, resource, from (ISO date), to (ISO date), ip, page, limit
- [x] Validation: page >= 1, limit 1-100 (default 20), dates are valid ISO strings
- [x] `AuditLogResponseDTO` for single audit log entry
- [x] `PaginatedAuditLogResponseDTO` with data array, total, page, limit
- [x] All DTOs use class-validator decorators
- [x] Swagger/OpenAPI decorators for API docs
**Files Affected**:
- `src/common/audit/dto/audit-log-filter.dto.ts` - Create
- `src/common/audit/dto/audit-log-response.dto.ts` - Create
- `src/common/audit/dto/paginated-audit-log-response.dto.ts` - Create

---

### Task 6.2: Create audit controller with admin endpoint
**Description**: Create REST controller for admin-only audit log query endpoint.
**Spec Reference**: AL-04
**Estimated Lines**: 60 lines
**Dependencies**: 2.2, 6.1
**Acceptance Criteria**:
- [x] Controller at `/admin/audit-logs` path
- [x] `GET /admin/audit-logs` endpoint with query params
- [x] Protected by `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(UserRole.ADMIN)`
- [x] Returns 403 for non-admin users
- [x] Returns paginated audit logs for admin users
- [x] Uses `AuditLogFilterDTO` for query validation
- [x] Returns `PaginatedAuditLogResponseDTO`
- [x] Unit tests for access control and query handling
**Files Affected**:
- `src/common/audit/audit.controller.ts` - Create
- `src/common/audit/audit.controller.spec.ts` - Create

---

### Task 6.3: Add API documentation
**Description**: Add Swagger/OpenAPI documentation for audit log endpoint.
**Spec Reference**: AL-04
**Estimated Lines**: 30 lines
**Dependencies**: 6.2
**Acceptance Criteria**:
- [x] `@ApiTags('admin')` on controller
- [x] `@ApiBearerAuth()` on controller
- [x] `@ApiOperation()` with description on endpoint
- [x] `@ApiQuery()` decorators for all filter parameters
- [x] `@ApiResponse()` for 200, 403, 401 status codes
- [x] Request/response examples in API docs
**Files Affected**:
- `src/common/audit/audit.controller.ts` - Modify
- `src/common/audit/api-docs/audit.decorator.ts` - Create

---

## Phase 7: Testing & Documentation (Tasks 7.1-7.4)

### Task 7.1: Create integration tests for audit module
**Description**: Write integration tests with real MongoDB for audit log persistence and querying.
**Spec Reference**: AL-01, AL-02, AL-04, AL-05
**Estimated Lines**: 200 lines
**Dependencies**: All previous phases
**Acceptance Criteria**:
- [x] Uses `mongodb-memory-server` (existing pattern)
- [x] Tests HTTP audit logging with mock requests
- [x] Tests business action auditing with decorated services
- [x] Tests admin endpoint with real admin user
- [x] Tests pagination and filtering
- [x] Tests TTL index creation (verify index exists)
- [x] All tests pass
**Files Affected**:
- `src/common/audit/audit.integration.spec.ts` - Create

---

### Task 7.2: Create e2e tests for audit endpoints
**Description**: Write end-to-end tests for audit log endpoint access control and functionality.
**Spec Reference**: AL-04, AL-06
**Estimated Lines**: 150 lines
**Dependencies**: 6.2, 7.1
**Acceptance Criteria**:
- [x] Test 403 response for non-admin user accessing /admin/audit-logs
- [x] Test 200 response with results for admin user
- [x] Test filter parameters work correctly
- [x] Test pagination metadata
- [x] Test AUDIT_ENABLED=false prevents audit creation
- [x] Uses `createTestApp()` helper from codebase
- [x] All tests pass (requires MongoDB running)
**Files Affected**:
- `test/audit-logs.e2e-spec.ts` - Create

---

### Task 7.3: Update existing service tests for audit events
**Description**: Update existing unit tests in auth, user, and rbac services to account for new audit event emissions.
**Spec Reference**: AL-02, AL-08
**Estimated Lines**: 100 lines (modifications)
**Dependencies**: 5.1, 5.2, 5.3
**Acceptance Criteria**:
- [x] `auth.service.spec.ts` - mock EventEmitter2 for audit.* events
- [x] `user.service.spec.ts` - mock EventEmitter2 for audit.* events
- [x] `role.service.spec.ts` - mock EventEmitter2 for audit.* events
- [x] `permission.service.spec.ts` - mock EventEmitter2 for audit.* events
- [x] All existing tests still pass
- [x] New assertions verify audit events are emitted with correct payload
**Files Affected**:
- `src/auth/auth.service.spec.ts` - Modify
- `src/user/service/user.service.spec.ts` - Modify
- `src/rbac/services/role.service.spec.ts` - Modify
- `src/rbac/services/permission.service.spec.ts` - Modify

---

### Task 7.4: Create module API documentation
**Description**: Create API documentation for audit module following codebase pattern (api-docs subdirectory).
**Spec Reference**: AL-04
**Estimated Lines**: 80 lines
**Dependencies**: 6.3
**Acceptance Criteria**:
- [x] Documentation in `src/common/audit/api-docs/` directory
- [x] Endpoint documentation with request/response examples
- [x] AUDIT_LEVEL configuration documented
- [x] Environment variables documented
- [x] Event types documented
- [x] Follows existing api-docs pattern from other modules
**Files Affected**:
- `src/common/audit/api-docs/audit-logs.md` - Create

---

## Dependencies Graph

```
Phase 1 (Foundation)
├── 1.1 ─┬──> 1.2 ──> 1.4
│        └──> 1.3 ──┘
│
Phase 2 (Core Infrastructure)
├── 1.2 ──> 2.1 ──> 2.2 ──┬──> 2.4
│                         │
├── 1.3 ──────────────────┼──> 2.3
│                         │
Phase 3 (Interceptor)      │
├── 1.3 ──┬──> 3.1 ──> 3.2 ──> 3.3
│         │
└── 1.4 ──┘
│
Phase 4 (Decorator)
├── 1.3 ──> 4.1 ──> 4.2
│
Phase 5 (Integration)
├── 4.1 ──┬──> 5.1
│         ├──> 5.2
│         └──> 5.3
│
Phase 6 (Admin Endpoint)
├── 6.1 ──┬──> 6.2 ──> 6.3
│         │
└── 2.2 ──┘
│
Phase 7 (Testing & Docs)
├── All phases ──> 7.1 ──> 7.2
├── 5.1, 5.2, 5.3 ──> 7.3
└── 6.3 ──> 7.4
```

---

## Spec Coverage Matrix

| Spec ID | Requirement | Tasks Covering | Status |
|---------|-------------|----------------|--------|
| AL-01 | HTTP request audit | 3.1, 3.2, 3.3, 7.1, 7.2 | ✅ Covered |
| AL-02 | Business action audit | 1.3, 4.1, 4.2, 5.1, 5.2, 5.3, 7.1, 7.3 | ✅ Covered |
| AL-03 | Sensitive data redaction | 2.3, 2.4, 7.1 | ✅ Covered |
| AL-04 | Admin audit querying | 2.1, 2.2, 6.1, 6.2, 6.3, 7.1, 7.2, 7.4 | ✅ Covered |
| AL-05 | TTL retention 30 days | 1.1, 1.2, 1.4, 7.1 | ✅ Covered |
| AL-06 | Enable/disable toggle | 1.1, 2.3, 3.1, 7.2 | ✅ Covered |
| AL-07 | Env validation | 1.1, 1.4 | ✅ Covered |
| AL-08 | Async persistence | 1.3, 1.4, 2.1, 2.3, 2.4, 4.2, 7.3 | ✅ Covered |
| AL-09 | AUDIT_LEVEL configuration | 1.1, 3.1, 7.1 | ✅ Covered |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CLS context not propagated to services | HIGH: userId missing from audit logs | Verify JwtAuthGuard sets CLS before service execution; add integration test |
| EventEmitter2 not configured globally | HIGH: Events not emitted | Check app.module.ts imports `EventEmitterModule.forRoot()` |
| TTL index not created dynamically | MEDIUM: Audit logs never expire | Verify `onModuleInit()` runs and creates index; add test |
| Redaction misses nested sensitive fields | MEDIUM: Data leakage | Use recursive redaction; test with deeply nested objects |
| Interceptor slows down requests | LOW: Performance impact | Benchmark interceptor overhead; ensure async emit doesn't block |
| Large PR difficult to review | MEDIUM: Review quality suffers | Consider chained PRs (3 PRs: Foundation+Core, Interceptor+Decorator, Integration+Tests) |

---

## Next Recommended Steps

1. **Review and approve tasks** - Verify task breakdown aligns with spec and design
2. **Decide PR strategy** - Single PR (exception-ok) vs 3 chained PRs for review quality
3. **Begin Phase 1** - Start with env validation (1.1) and entity (1.2) as foundation
4. **Run existing tests** - Ensure current test suite passes before adding audit code
5. **Set up feature branch** - `feature/audit-logging` per project convention
