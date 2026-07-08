# Proposal: Structured Logging Standardization

## Intent

Replace text-based `CustomLogger` (extends `ConsoleLogger`) with JSON structured logging via `nestjs-pino`. Fastify already uses pino internally for HTTP request logs (with redaction, ISO timestamps, hyperid request IDs), but services cannot access it. CLS (`nestjs-cls` v6.2.0) is installed and used in `AuditInterceptor` but correlation IDs never reach application log output. This change unifies all logging under a single JSON-structured engine with CLS correlation IDs.

## Scope

### In Scope
- Install `nestjs-pino` + `pino-http` as dependencies
- Configure `nestjs-pino` as global NestJS logger in `main.ts`
- Integrate CLS correlation ID injection (`useExisting: true`)
- Refactor 11 files using `CustomLogger` to use NestJS `Logger` / DI-injected logger
- Refactor 6 files using bare `@nestjs/common Logger` to use DI-injected logger
- Delete `src/common/logger.ts` (CustomLogger)
- Update 4 seed scripts to use standalone pino instance outside NestJS context
- Suppress test output during `npm test` via pino transport config

### Out of Scope
- Log shipping to external services (Datadog, ELK, etc.)
- Log file rotation or file-based transports
- Distributed tracing integration (separate concern)
- Changes to audit logging behavior (audit-logging spec unchanged)

## Capabilities

### New Capabilities
- `structured-logging`: JSON structured logging with CLS correlation IDs, redaction rules, and test output suppression via nestjs-pino

### Modified Capabilities
- None — no existing spec-level behavior changes. This is an implementation-level concern affecting how logs are emitted, not what is logged.

## Approach

1. Add `nestjs-pino` + `pino-http` to dependencies
2. Configure `LoggerModule.forRoot()` in `AppModule` with:
   - `pino-http` transport using `pino-pretty` for dev, raw JSON for production
   - `useExisting: true` for CLS integration (correlation ID from `nestjs-cls` store)
   - Redaction rules matching existing Fastify config (passwords, tokens, auth headers)
   - Test environment: `transport: { target: 'pino-noop' }` or `level: 'silent'`
3. Replace `new CustomLogger(Context)` with DI-injected `Logger` in all services/controllers
4. Refactor `transaction.ts` module-level Logger to use a shared logger utility or DI
5. Create standalone pino instance for seed scripts (outside NestJS DI context)
6. Delete `src/common/logger.ts`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add nestjs-pino, pino-http, pino-pretty |
| `src/main.ts` | Modified | Replace Fastify-only pino with nestjs-pino global logger |
| `src/common/logger.ts` | Deleted | CustomLogger removed entirely |
| `src/app.module.ts` | Modified | Import and configure LoggerModule |
| `src/**/*.service.ts` | Modified | Switch to DI-injected Logger (5 files) |
| `src/**/*.controller.ts` | Modified | Switch to DI-injected Logger (3 files) |
| `src/**/*.repository.ts` | Modified | Switch to DI-injected Logger (1 file) |
| `src/**/*.listener.ts` | Modified | Switch to DI-injected Logger (2 files) |
| `src/common/utils/transaction.ts` | Modified | Replace module-level Logger |
| `src/common/validators/password-strength.validator.ts` | Modified | Replace module-level Logger |
| `src/config/custom-providers/microservice-provider.ts` | Modified | Replace CustomLogger factory |
| `src/database/seeds/*.ts` | Modified | Use standalone pino (4 files) |
| `test/jest.setup.ts` | Modified | Ensure test log suppression |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test output leaks during CI | Low | Configure pino `level: 'silent'` in test env, verify with `npm test` |
| Seed scripts break without NestJS context | Medium | Use standalone `pino()` instance for scripts, test each seed |
| CLS context not available in early lifecycle | Low | nestjs-pino `useExisting: true` handles this; verify in e2e |
| Log format change breaks log parsing | Medium | Document new JSON schema; coordinate with ops team if applicable |

## Rollback Plan

1. Revert the change commits via `git revert`
2. Remove `nestjs-pino`, `pino-http`, `pino-pretty` from `package.json`
3. Restore `src/common/logger.ts` from git history
4. Run `npm install` to remove new dependencies
5. Verify `npm test` passes with restored CustomLogger

## Dependencies

- None from other SDD cycles
- Requires `nestjs-cls` v6.2.0 (already installed) for correlation ID integration

## Success Criteria

- [ ] All application logs output as valid JSON with `level`, `msg`, `time`, `reqId` fields
- [ ] CLS correlation ID appears in every log entry within a request context
- [ ] `npm test` produces no log output (silent mode)
- [ ] All 4 seed scripts run successfully with standalone pino
- [ ] No regression in audit logging behavior (audit-logging spec still passes)
- [ ] Redaction rules apply to passwords, tokens, and auth headers in log output
