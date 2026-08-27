# Exploration: Structured Logging Standardization

**Change**: `feature/structured-logging`
**Ticket**: COU-116 (Cycle 4)
**Date**: 2026-07-08

---

## Current State

### CustomLogger Implementation (`src/common/logger.ts`)
- Extends `@nestjs/common` `ConsoleLogger`
- **Only custom behavior**: suppresses all output during `NODE_ENV=test` unless `DEBUG=true`
- **No JSON output** — plain text via ConsoleLogger
- **No structured fields** — no correlationId, no requestId, no extra context
- **No CLS integration** — correlation IDs exist in the app but are never injected into logs

### Fastify Logger (`src/main.ts`)
- Fastify adapter is configured with pino options:
  - `redact: ['headers.authorization']`
  - `timestamp: () => new Date().toISOString()`
  - `level: isProd() ? 'info' : 'debug'`
  - `genReqId: () => hyperid().uuid`
- **Problem**: This pino logger is only used by Fastify internally for HTTP request logging. NestJS services do NOT use it — they use `CustomLogger` (ConsoleLogger) which outputs plain text.

### Logger Usage Inventory

| Logger Type | File Count | Files |
|-------------|-----------|-------|
| `CustomLogger` | 11 | user.repository, user.controller, app.controller, audit.listener, email.listener, encode.service, microservice-provider, seed-\* (4 files) |
| `@nestjs/common Logger` | 6 | auth.service, i18n.service, email.service, email-template.service, password-strength.validator, transaction.ts |
| **Total** | **17** | |

### CLS (nestjs-cls) Correlation IDs
- `nestjs-cls` v6.2.0 is installed and configured globally with middleware mount
- `AuditInterceptor` already extracts correlationId: `request.id ?? clsService.getId() ?? 'unknown'`
- `JwtAuthGuard` stores `userId` and `ipAddress` in CLS store
- **Gap**: No logger currently accesses CLS to include correlationId in log output

### Dependencies
- **pino**: NOT a direct dependency (Fastify bundles it internally)
- **nestjs-pino**: NOT installed
- **winston**: NOT installed
- **nestjs-cls**: v6.2.0 — already installed and active

### Output Destination
- All logs go to stdout/stderr — no file-based logging
- Audit records are separately persisted to MongoDB (structured, but not logs)

---

## Approaches

### Approach 1: `nestjs-pino` (Recommended)

Install `nestjs-pino` + `pino-http` as a global NestJS logger provider.

**How it works**:
- `LoggerModule.forRoot()` replaces NestJS logger globally
- `LoggerModule.forFeature()` injects `Logger` into services
- Automatically reads CLS correlation IDs via `useExisting: ClsService`
- JSON output with configurable fields

**Pros**:
- First-class NestJS integration — `this.logger.log()` works identically
- Built-in CLS correlation ID support (`cls: { useExisting: true }`)
- Automatic request context binding (req.id, userId, etc.)
- Pino is already the Fastify default — no new logging engine
- Rich ecosystem: transports, redaction, pretty-print for dev
- Minimal code changes — just swap logger instantiation

**Cons**:
- Adds 2 new dependencies (`nestjs-pino`, `pino-http`)
- Requires updating all 17 files that instantiate loggers
- Test suppression behavior needs re-implementation (currently in CustomLogger)

**Effort**: Medium

**Files to modify**:
- `package.json` — add `nestjs-pino`, `pino-http`
- `src/main.ts` — configure LoggerModule, remove CustomLogger from NestFactory
- `src/app/app.module.ts` — import LoggerModule with CLS integration
- `src/common/logger.ts` — replace CustomLogger with PinoLogger wrapper or delete
- **17 service/controller files** — replace `new CustomLogger()` / `new Logger()` with injected `Logger`

### Approach 2: Custom Pino Wrapper (Extend ConsoleLogger with JSON)

Keep the CustomLogger pattern but make it output JSON manually.

**How it works**:
- Modify `CustomLogger` to format output as JSON strings
- Manually read CLS store for correlationId in each log call
- No new dependencies beyond what Fastify already bundles

**Pros**:
- Zero new dependencies
- Minimal import changes — CustomLogger stays the same class
- Full control over JSON schema

**Cons**:
- Reinventing the wheel — pino already does this better
- Manual CLS access is fragile (CLS may not be available in all contexts)
- No built-in redaction, serializers, or transports
- Harder to integrate with log aggregators (no standard Pino fields)
- Performance: manual JSON.stringify vs pino's optimized serialization
- Loses Fastify pino config alignment — two separate logger configs

**Effort**: Low-Medium

### Approach 3: Fastify-Only (Configure pino-http as NestJS Logger)

Use Fastify's underlying pino instance as the NestJS logger via `app.useLogger()`.

**How it works**:
- Extract pino instance from Fastify adapter
- Wrap it in a NestJS `LoggerService` implementation
- Pass to `NestFactory.create({ logger: ... })`

**Pros**:
- Single pino instance across Fastify + NestJS
- No new dependencies
- Reuses existing Fastify config (redaction, levels)

**Cons**:
- Complex wiring between Fastify and NestJS lifecycles
- CLS correlation ID injection requires custom middleware
- Harder to test (tied to Fastify adapter internals)
- NestJS bootstrap happens before Fastify is fully ready
- Fragile — depends on internal Fastify adapter APIs

**Effort**: Medium-High

---

## Recommendation

**Approach 1: `nestjs-pino`**

It's the cleanest path because:
1. The skill rule (`p1-logging.md`) explicitly recommends `pino` or `winston` with correlation IDs
2. CLS is already installed — `nestjs-pino` has native CLS integration
3. Fastify already uses pino — we're standardizing on the same engine
4. The JSON schema is industry-standard (Pino format works with Datadog, ELK, Loki, etc.)
5. Test suppression can be handled via pino's `transport` config or a custom stream

### Proposed JSON Output Format
```json
{
  "level": 30,
  "time": "2026-07-08T15:30:00.000Z",
  "pid": 12345,
  "hostname": "api-user-abc123",
  "reqId": "hyperid-uuid-here",
  "correlationId": "hyperid-uuid-here",
  "context": "UserService",
  "msg": "User created successfully",
  "userId": "user-123"
}
```

---

## Risks

1. **Test output changes**: Current CustomLogger suppresses output in tests. Pino's test behavior needs explicit configuration (likely a silent transport or `level: 'silent'` in test env).
2. **17 files to update**: Each file that instantiates `new CustomLogger()` or `new Logger()` needs refactoring. Most can use dependency injection instead of `new Logger()`.
3. **Seed scripts**: 4 seed files use `new CustomLogger()` in standalone scripts (not NestJS context). These may need a standalone pino instance or keep a simple console logger.
4. **`transaction.ts`**: Uses module-level `new Logger()` — needs refactoring to accept logger or use a factory.
5. **Breaking change for log consumers**: Any external tooling parsing current text logs will need updating.

---

## Files to Modify/Create

| File | Action | Reason |
|------|--------|--------|
| `package.json` | Modify | Add `nestjs-pino`, `pino-http` |
| `src/main.ts` | Modify | Configure LoggerModule, remove Fastify logger config duplication |
| `src/app/app.module.ts` | Modify | Import LoggerModule with CLS integration |
| `src/common/logger.ts` | Replace/Delete | Replace CustomLogger with PinoLogger or remove entirely |
| `src/common/logger.spec.ts` | Create | Test the new logger configuration |
| `src/user/repository/user.repository.ts` | Modify | Inject Logger instead of `new CustomLogger()` |
| `src/user/controller/user.controller.ts` | Modify | Inject Logger instead of `new CustomLogger()` |
| `src/app/controller/app.controller.ts` | Modify | Inject Logger instead of `new CustomLogger()` |
| `src/common/audit/audit.listener.ts` | Modify | Inject Logger instead of `new CustomLogger()` |
| `src/email/listeners/email.listener.ts` | Modify | Inject Logger instead of `new CustomLogger()` |
| `src/encode/encode.service.ts` | Modify | Inject Logger instead of `new CustomLogger()` |
| `src/config/custom-providers/microservice-provider.ts` | Modify | Use factory logger |
| `src/common/utils/transaction.ts` | Modify | Accept logger parameter or use Pino directly |
| `src/common/i18n/i18n.service.ts` | Modify | Inject Logger instead of `new Logger()` |
| `src/common/validators/password-strength.validator.ts` | Modify | Inject Logger instead of `new Logger()` |
| `src/email/service/email.service.ts` | Modify | Inject Logger instead of `new Logger()` |
| `src/email/service/email-template.service.ts` | Modify | Inject Logger instead of `new Logger()` |
| `src/auth/auth.service.ts` | Modify | Inject Logger instead of `new Logger()` |
| `src/database/seeds/*.ts` (4 files) | Modify | Use standalone pino or simple console for seeds |

---

## Ready for Proposal

**Yes** — sufficient information gathered to proceed to spec and design phase.

The orchestrator should tell the user:
> Exploration complete. Found 17 files using CustomLogger or @nestjs/common Logger (plain text). Fastify already configures pino for HTTP requests, but NestJS services don't use it. CLS correlation IDs exist but aren't in logs. Recommend `nestjs-pino` for native NestJS + CLS integration with JSON output. 17 files need refactoring to use dependency-injected logger. Seed scripts need special handling. Ready to proceed with spec and design.
