# Design: Structured Logging Standardization

## Technical Approach

Replace `CustomLogger` (plain-text `ConsoleLogger`) with `nestjs-pino` + `pino-http` as the unified JSON logging engine. Configure `LoggerModule.forRoot()` in `AppModule` with CLS correlation ID injection via `useExisting: true`, pino redaction for sensitive fields, and environment-aware log levels. Refactor 17 files to use DI-injected `Logger`. Create a shared `createStandaloneLogger()` utility for seed scripts running outside NestJS DI context.

## Architecture Decisions

### Decision 1: Use `LoggerModule.forRoot()` from nestjs-pino

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `LoggerModule.forRoot()` | First-class NestJS integration, automatic CLS binding, minimal wiring | **Chosen** |
| Manual pino config + `app.useLogger()` | Complex Fastify/NestJS lifecycle wiring, fragile | Rejected |
| Custom JSON ConsoleLogger wrapper | Reinventing pino, no redaction/transports, manual CLS access | Rejected |

**Rationale**: `nestjs-pino` is the standard NestJS-pino bridge. It handles global logger registration, CLS injection, and request-context binding out of the box. The skill (`p1-logging.md`) recommends pino with correlation IDs.

### Decision 2: CLS correlation ID via nestjs-pino's built-in `useExisting`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `cls: { useExisting: true }` | Zero custom code, native nestjs-pino feature, auto-picks up `nestjs-cls` store | **Chosen** |
| Custom pino serializer reading `ClsService` manually | More control but fragile, duplicate logic | Rejected |

**Rationale**: `nestjs-pino` natively supports `nestjs-cls` via `useExisting: true`. It automatically reads the CLS store and injects the correlation ID into every log entry. No custom serializers needed.

### Decision 3: Shared `createStandaloneLogger()` utility for seed scripts

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Shared `createStandaloneLogger()` in `src/common/logger.ts` (new file) | Single source of truth, consistent config, easy to maintain | **Chosen** |
| Each seed creates its own `pino()` instance | Duplicated config, inconsistent output, harder to change | Rejected |

**Rationale**: All 4 seed scripts need the same pino config (JSON format, redaction, level). A shared factory eliminates duplication. The file replaces the old `CustomLogger` — same path, new purpose.

### Decision 4: `transaction.ts` — accept Logger via function parameter

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Pass logger as optional function parameter | Clean, testable, no module-level state | **Chosen** |
| Keep module-level `new Logger()` | Simple but untestable, breaks DI pattern | Rejected |
| Create a LoggerModule just for this utility | Over-engineering for a single function | Rejected |

**Rationale**: `runInTransaction` is a pure utility function, not a NestJS provider. Passing an optional logger parameter keeps it testable and avoids module-level state. Callers can pass their DI-injected logger or omit it.

### Decision 5: Unify Fastify pino config into nestjs-pino

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Remove Fastify logger config, let nestjs-pino handle all logging | Single config source, consistent output, no duplication | **Chosen** |
| Keep Fastify pino config separate | Two configs to maintain, potential inconsistency | Rejected |

**Rationale**: The current Fastify pino config (redaction, timestamp, level) duplicates what nestjs-pino will provide. By removing the Fastify logger config and letting nestjs-pino be the single source, we eliminate duplication and ensure consistency. The `genReqId` hyperid generator moves to the pino-http config.

### Decision 6: `LOG_LEVEL` via env.validation.ts + pino config

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add `LOG_LEVEL` to `env.validation.ts`, read via `ConfigService` in `LoggerModule.forRoot()` | Validated, typed, consistent with existing env pattern | **Chosen** |
| Direct `process.env.LOG_LEVEL` in pino config | Unvalidated, bypasses class-validator | Rejected |

**Rationale**: The project already uses `class-validator` for env validation. Adding `LOG_LEVEL` to `EnvironmentVariables` ensures it's validated and available via `ConfigService`. Default to `info` when not set.

## Data Flow

```
HTTP Request
    │
    ▼
Fastify Adapter (no logger config — delegated to nestjs-pino)
    │
    ▼
ClsMiddleware (generates/reads correlationId)
    │
    ▼
nestjs-pino pinoHttp (injects correlationId from CLS store)
    │
    ├──► reqId: hyperid-generated request ID
    ├──► correlationId: from ClsService.getId()
    └──► redact: ['password', 'token', 'authorization', ...]
    │
    ▼
Service/Controller/Repository (DI-injected Logger)
    │
    ├──► this.logger.info('User created', { userId: '123' })
    ├──► this.logger.warn('Rate limit approaching')
    └──► this.logger.error('DB connection failed', err.stack)
    │
    ▼
Pino (JSON output to stdout)
    │
    ├──► Development: pino-pretty (human-readable)
    ├──► Production: raw JSON
    └──► Test: silent (unless DEBUG=true)
```

For seed scripts (outside NestJS context):
```
Seed Script (ts-node)
    │
    ▼
createStandaloneLogger('SeedName')
    │
    ├──► pino({ level: 'info', redact: [...] })
    └──► Returns pino.Logger instance
    │
    ▼
JSON output to stdout
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `nestjs-pino`, `pino-http`, `pino-pretty` as dependencies |
| `src/main.ts` | Modify | Remove Fastify logger config; keep `genReqId` hyperid; no `useLogger` needed (nestjs-pino handles it) |
| `src/common/logger.ts` | Replace | Delete `CustomLogger` class; create `createStandaloneLogger()` factory for seed scripts |
| `src/app/app.module.ts` | Modify | Import `LoggerModule.forRoot()` with CLS, redaction, level config; add `LoggerModule` to imports |
| `src/config/env.validation.ts` | Modify | Add `LOG_LEVEL` optional field with enum validation |
| `src/user/service/user.service.ts` | No change | Already uses no logger — no changes needed |
| `src/user/controller/user.controller.ts` | Modify | Replace `new CustomLogger()` with DI-injected `Logger` |
| `src/user/repository/user.repository.ts` | Modify | Replace `new CustomLogger()` with DI-injected `Logger` |
| `src/app/controller/app.controller.ts` | Modify | Replace `new CustomLogger()` with DI-injected `Logger` |
| `src/common/audit/audit.listener.ts` | Modify | Replace `new CustomLogger()` with DI-injected `Logger` |
| `src/email/listeners/email.listener.ts` | Modify | Replace `new CustomLogger()` with DI-injected `Logger` |
| `src/encode/encode.service.ts` | Modify | Replace `new CustomLogger()` with DI-injected `Logger` |
| `src/common/i18n/i18n.service.ts` | Modify | Replace `new Logger()` with DI-injected `Logger` |
| `src/email/service/email.service.ts` | Modify | Replace `new Logger()` with DI-injected `Logger` |
| `src/email/service/email-template.service.ts` | Modify | Replace `new Logger()` with DI-injected `Logger` (was not using logger actively, remove unused) |
| `src/auth/auth.service.ts` | Modify | Replace `new Logger()` import (unused — remove import) |
| `src/common/utils/transaction.ts` | Modify | Replace module-level `Logger` with optional logger parameter |
| `src/common/validators/password-strength.validator.ts` | Modify | Replace `new Logger()` with optional logger parameter or remove (validator should not log) |
| `src/config/custom-providers/microservice-provider.ts` | Modify | Replace `new CustomLogger()` with injected logger from factory |
| `src/database/seeds/seed-permissions.ts` | Modify | Use `createStandaloneLogger()` instead of `CustomLogger` |
| `src/database/seeds/seed-roles.ts` | Modify | Use `createStandaloneLogger()` instead of `CustomLogger` |
| `src/database/seeds/seed-users.ts` | Modify | Use `createStandaloneLogger()` instead of `CustomLogger` |
| `src/database/seeds/seed-email-templates.ts` | Modify | Use `createStandaloneLogger()` instead of `CustomLogger` |
| `test/jest.setup.ts` | Modify | Set `LOG_LEVEL=silent` for test env |

## Interfaces / Contracts

### nestjs-pino LoggerModule.forRoot() Configuration

```typescript
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.NODE_ENV === 'test' && !process.env.DEBUG
      ? 'silent'
      : (process.env.LOG_LEVEL || 'info'),
    redact: {
      paths: [
        'req.headers.authorization',
        'req.body.password',
        'req.body.token',
        'req.body.refreshToken',
        'req.body.resetPasswordToken',
        'req.body.emailVerificationToken',
        'req.body.pendingEmailToken',
        'res.headers.authorization',
      ],
      censor: '[REDACTED]',
    },
    genReqId: (req: FastifyRequest) => {
      // Reuse existing hyperid pattern
      return hyperid().uuid;
    },
    customProps: (req: FastifyRequest) => {
      // Inject CLS correlation ID if available
      const clsId = ClsServiceManager.getClsService()?.getId();
      return clsId ? { correlationId: clsId } : {};
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined // raw JSON
        : { target: 'pino-pretty', options: { colorize: true } },
  },
  exclude: [{ method: '*' as HTTPMethods, path: '/health' }],
  useExisting: true, // Use existing CLS context from nestjs-cls
})
```

### createStandaloneLogger() Factory

```typescript
import pino from 'pino';

export function createStandaloneLogger(context: string): pino.Logger {
  return pino({
    name: context,
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: ['password', 'token', 'authorization', 'refreshToken'],
      censor: '[REDACTED]',
    },
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { colorize: true } },
  });
}
```

### runInTransaction() Updated Signature

```typescript
export async function runInTransaction<T>(
  connection: Connection,
  callback: (session: ClientSession) => Promise<T>,
  logger?: { warn: (msg: string) => void },
): Promise<T>
```

### PasswordStrengthValidator — Remove Logger

The validator's `logger.warn()` call in `validatePassword()` is a security monitoring concern. Since validators are instantiated by `class-validator` (not NestJS DI), we cannot inject a logger. Options:
- **Remove the log entirely**: Password validation failures are already returned as validation errors — the caller handles them.
- **Use a global pino instance**: Create a module-level `pino()` instance (acceptable for this single case).

**Decision**: Replace `new Logger()` with a module-level `pino()` instance. This is the one exception to the DI-only rule, justified because `class-validator` creates instances outside NestJS DI.

```typescript
import pino from 'pino';
const logger = pino({ name: 'PasswordStrengthValidator', level: 'warn' });
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `createStandaloneLogger()` returns valid pino instance | Instantiate, verify `info`/`warn`/`error` methods exist, verify JSON output via custom stream |
| Unit | `runInTransaction()` with optional logger | Mock logger, verify warn is called when `startSession` fails |
| Unit | Password validator with pino logger | Verify warn is called on invalid password (mock pino transport) |
| Integration | LoggerModule configured in AppModule | Create test module with `LoggerModule.forRoot()`, verify logger is injected into services |
| Integration | CLS correlation ID in log output | Use `ClsModule` + `LoggerModule` in test, trigger request, verify `correlationId` in log |
| E2E | JSON log format in HTTP requests | Hit endpoint, capture stdout, parse JSON, verify `level`, `msg`, `reqId`, `correlationId` fields |
| E2E | Test output suppression | Run `npm test`, verify no log output appears in console |
| E2E | Redaction rules apply | Send request with `Authorization` header, verify `[REDACTED]` in log output |
| Seed | Each seed script runs with standalone logger | Run each seed via `ts-node`, verify JSON output, verify no NestJS dependency |

### Testing JSON Output Format

For unit tests, capture pino output via a custom transport stream:

```typescript
const logOutput: string[] = [];
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino/file',
    options: {
      destination: new Writable({
        write(chunk, _encoding, callback) {
          logOutput.push(chunk.toString());
          callback();
        },
      }),
    },
  },
});
```

For e2e tests, verify the AppModule bootstrap produces JSON logs by capturing stdout during test execution.

## Migration / Rollout

No migration required. This is a logging infrastructure change with no data migration.

**Rollout plan**:
1. Add dependencies (`npm install nestjs-pino pino-http pino-pretty`)
2. Configure `LoggerModule.forRoot()` in `AppModule`
3. Update `main.ts` to remove Fastify logger config
4. Refactor files one module at a time (controllers → services → repositories → listeners → utilities)
5. Update seed scripts to use `createStandaloneLogger()`
6. Delete old `CustomLogger` class
7. Run full test suite to verify no regressions

**Feature flags**: None needed. Logging is an internal concern.

**Rollback**: Revert commits, restore `CustomLogger`, remove `nestjs-pino` dependencies.

## Open Questions

- [ ] Should `/health` endpoint be excluded from HTTP request logging? (Currently proposed — low-value noise)
- [ ] Should we add `pid` and `hostname` to the JSON output? (Pino adds these by default — confirm acceptable)
- [ ] For `password-strength.validator.ts`, is a module-level pino instance acceptable given it's outside DI? (Decision: yes, it's the only viable option)
