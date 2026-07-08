# structured-logging Specification

## Purpose

JSON structured logging with CLS correlation IDs, sensitive data redaction, and environment-aware log levels via `nestjs-pino` + `pino-http`. Replaces text-based `CustomLogger` with a unified logging engine across all services, controllers, seed scripts, and utility modules.

## Requirements

| ID | Requirement | Strength |
|----|-------------|----------|
| LOG-01 | All application logs MUST be output as JSON (not plain text) | MUST |
| LOG-02 | Every log entry MUST include a correlation ID from CLS (`nestjs-cls`) | MUST |
| LOG-03 | `nestjs-pino` + `pino-http` MUST be configured as the global NestJS logger | MUST |
| LOG-04 | `CustomLogger` (src/common/logger.ts) MUST be removed; all consumers MUST use DI-injected pino `Logger` | MUST |
| LOG-05 | Sensitive data (passwords, tokens, Authorization headers) MUST be redacted in log output via pino redaction | MUST |
| LOG-06 | Log level MUST be configurable via `LOG_LEVEL` env var (default: `info`) | MUST |
| LOG-07 | In test environment (`NODE_ENV=test`), log level MUST default to `silent` unless `DEBUG=true` | MUST |
| LOG-08 | Seed scripts (outside NestJS DI context) MUST use a standalone pino instance | MUST |

## Scenarios

### LOG-S01: Application logs output as JSON

- GIVEN the application is running in production (`NODE_ENV=production`)
- WHEN a service calls `logger.info('User created')`
- THEN the log output MUST be valid JSON containing `level`, `msg`, `time` fields
- AND the output MUST NOT be plain text

### LOG-S02: Correlation ID present in request-scoped logs

- GIVEN a request enters the system and CLS assigns correlation ID `abc-123`
- WHEN multiple services log within that request lifecycle
- THEN every log entry MUST include `correlationId: "abc-123"`
- AND all entries from the same request MUST share the same correlation ID

### LOG-S03: Log entry when CLS context not initialized

- GIVEN the CLS context is not initialized (e.g., startup phase, background task)
- WHEN a service logs a message
- THEN the log entry MUST still be valid JSON
- AND the `correlationId` field MUST be absent or set to a fallback value (e.g., `"N/A"`)

### LOG-S04: nestjs-pino configured as global logger

- GIVEN the application starts via `NestFactory.create()`
- WHEN `LoggerModule.forRoot()` is configured in `AppModule`
- THEN `nestjs-pino` MUST be registered as the global NestJS logger
- AND all `@nestjs/common` `Logger` instances MUST route through pino

### LOG-S05: CustomLogger removed from all consumers

- GIVEN `src/common/logger.ts` is deleted
- WHEN the application compiles and runs
- THEN no file MUST import or reference `CustomLogger`
- AND all 17 previously consuming files MUST use DI-injected `Logger`
- AND module-level loggers in `transaction.ts` and `password-strength.validator.ts` MUST be refactored

### LOG-S06: Sensitive data redacted in logs

- GIVEN pino redaction paths include `password`, `token`, `authorization`, `refreshToken`
- WHEN a log call includes an object containing `{ password: "secret123" }`
- THEN the log output MUST show `"password": "[Redacted]"` (or equivalent)
- AND the raw password value MUST NOT appear in any log output

### LOG-S07: Sensitive data in error messages redacted

- GIVEN an error is thrown with a message containing a token value
- WHEN the error is logged via `logger.error()`
- THEN the token value MUST be redacted in the log output

### LOG-S08: LOG_LEVEL env var controls log level

- GIVEN `LOG_LEVEL=debug` is set in the environment
- WHEN the application starts
- THEN the pino logger MUST output debug-level and above messages
- AND trace-level messages MUST be suppressed

- GIVEN `LOG_LEVEL` is not set
- WHEN the application starts
- THEN the log level MUST default to `info`

### LOG-S09: Test environment defaults to silent

- GIVEN `NODE_ENV=test` and `DEBUG` is not set
- WHEN the application runs under `npm test`
- THEN the log level MUST be `silent` (no log output)

- GIVEN `NODE_ENV=test` and `DEBUG=true`
- WHEN the application runs under `npm test`
- THEN log output MUST be visible at the configured `LOG_LEVEL`

### LOG-S10: Seed scripts use standalone pino

- GIVEN a seed script runs outside NestJS DI context (e.g., `ts-node src/database/seeds/user.seed.ts`)
- WHEN the seed script logs messages
- THEN it MUST use a standalone `pino()` instance
- AND log output MUST be valid JSON
- AND the script MUST NOT depend on NestJS modules or CLS

### LOG-S11: Multiple log levels in same request share correlation ID

- GIVEN a request with correlation ID `req-456`
- AND the request triggers `logger.debug()`, `logger.info()`, and `logger.warn()` calls
- WHEN all three log calls execute
- THEN all three entries MUST include `correlationId: "req-456"`
- AND each entry MUST have the correct `level` field

## Affected Files

| File | Change |
|------|--------|
| `package.json` | Add `nestjs-pino`, `pino-http`, `pino-pretty` |
| `src/main.ts` | Configure nestjs-pino as global logger |
| `src/common/logger.ts` | Deleted |
| `src/app/app.module.ts` | Import `LoggerModule.forRoot()` with CLS + redaction |
| `src/config/env.validation.ts` | Add `LOG_LEVEL` validation |
| `src/**/*.service.ts` | Replace CustomLogger with DI Logger (5 files) |
| `src/**/*.controller.ts` | Replace CustomLogger with DI Logger (3 files) |
| `src/**/*.repository.ts` | Replace CustomLogger with DI Logger (1 file) |
| `src/**/*.listener.ts` | Replace CustomLogger with DI Logger (2 files) |
| `src/common/utils/transaction.ts` | Replace module-level Logger |
| `src/common/validators/password-strength.validator.ts` | Replace module-level Logger |
| `src/config/custom-providers/microservice-provider.ts` | Replace CustomLogger factory |
| `src/database/seeds/*.ts` | Use standalone pino (4 files) |
| `test/jest.setup.ts` | Ensure test log suppression |
