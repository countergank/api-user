# Tasks: Structured Logging Standardization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 280–350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation: install deps, configure LoggerModule, env validation, standalone logger factory | PR 1 | Base branch; tests for createStandaloneLogger included |
| 2 | Refactor: replace all CustomLogger + bare Logger consumers, update seeds, cleanup | PR 1 (same) | Depends on Unit 1; mechanical replacements across 21 files |

## Phase 1: Foundation — Install & Configure (TDD)

- [ ] 1.1 **RED**: Write unit test for `createStandaloneLogger()` — verify it returns a pino instance with `info`/`warn`/`error` methods and JSON output via writable stream capture. File: `src/common/__tests__/logger.spec.ts`
- [ ] 1.2 **GREEN**: Install dependencies (`npm install nestjs-pino pino-http pino-pretty`) and replace `src/common/logger.ts` — delete `CustomLogger` class, create `createStandaloneLogger(context: string): pino.Logger` factory with redaction + level config per design
- [ ] 1.3 **REFACTOR**: Add `LOG_LEVEL` optional field to `EnvironmentVariables` in `src/config/env.validation.ts` with `@IsEnum(['trace','debug','info','warn','error','fatal','silent'])` + `@IsOptional()`
- [ ] 1.4 **RED**: Write test verifying `LoggerModule.forRoot()` config — test that pino logger is injected as global logger, CLS correlation ID appears in log output, redaction paths censor sensitive fields. File: `test/logger-integration.spec.ts`
- [ ] 1.5 **GREEN**: Configure `LoggerModule.forRoot()` in `src/app/app.module.ts` — add `LoggerModule` to imports with `useExisting: true`, redaction paths (`req.headers.authorization`, `req.body.password`, `req.body.token`, `req.body.refreshToken`, etc.), level from `ConfigService`, `exclude: ['/health']`
- [ ] 1.6 **GREEN**: Update `src/main.ts` — remove Fastify `logger` config block from `FastifyAdapter` options (nestjs-pino handles all logging now); keep `genReqId` hyperid if needed or move to pino config
- [ ] 1.7 **GREEN**: Update `test/jest.setup.ts` — add `process.env.LOG_LEVEL = 'silent'` for test environment suppression (LOG-S09)

## Phase 2: Refactor — Replace CustomLogger (TDD)

- [ ] 2.1 **Refactor controllers** (3 files): Replace `new CustomLogger()` with DI-injected `Logger` from `@nestjs/common` in `src/user/controller/user.controller.ts`, `src/app/controller/app.controller.ts`, `src/common/audit/audit.controller.ts` (if applicable — verify import). Remove `CustomLogger` import, add `Logger` to constructor injection
- [ ] 2.2 **Refactor services** (3 files): Replace `new CustomLogger()` with DI-injected `Logger` in `src/encode/encode.service.ts`, `src/common/audit/audit.service.ts` (verify), `src/email/service/email.service.ts`. Remove `CustomLogger`/bare `Logger` instantiation, inject via constructor
- [ ] 2.3 **Refactor repositories** (1 file): Replace `new CustomLogger()` with DI-injected `Logger` in `src/user/repository/user.repository.ts`
- [ ] 2.4 **Refactor listeners** (2 files): Replace `new CustomLogger()` with DI-injected `Logger` in `src/common/audit/audit.listener.ts`, `src/email/listeners/email.listener.ts`
- [ ] 2.5 **Refactor bare @nestjs/common Logger** (3 files): Replace `new Logger()` with DI-injected `Logger` in `src/common/i18n/i18n.service.ts`, `src/email/service/email-template.service.ts` (remove unused logger if inactive). For `src/auth/auth.service.ts` — remove unused `Logger` import entirely
- [ ] 2.6 **Refactor module-level loggers**: `src/common/utils/transaction.ts` — remove module-level `const logger = new Logger()`, add optional `logger?: { warn: (msg: string) => void }` parameter to `runInTransaction()`. `src/common/validators/password-strength.validator.ts` — replace `new Logger()` with module-level `pino({ name: 'PasswordStrengthValidator', level: 'warn' })`
- [ ] 2.7 **Refactor microservice provider**: `src/config/custom-providers/microservice-provider.ts` — replace `new CustomLogger(name)` with injected `Logger` from factory (add `Logger` to `inject` array, use `pino` child logger or accept from module)
- [ ] 2.8 **Refactor seed scripts** (4 files): Replace `new CustomLogger()` with `createStandaloneLogger()` in `src/database/seeds/seed-users.ts`, `src/database/seeds/seed-roles.ts`, `src/database/seeds/seed-permissions.ts`, `src/database/seeds/seed-email-templates.ts`

## Phase 3: Cleanup & Verification

- [ ] 3.1 Verify no remaining imports of `CustomLogger` — run `grep -r "CustomLogger" src/` and confirm zero matches
- [ ] 3.2 Run `npx tsc --noEmit` — confirm zero TypeScript errors
- [ ] 3.3 Run `npm test` — confirm all unit + e2e tests pass, no log output in test console (LOG-S09)
- [ ] 3.4 Verify JSON output format — run app briefly, capture stdout, confirm valid JSON with `level`, `msg`, `time` fields (LOG-S01)
- [ ] 3.5 Verify redaction — send request with `Authorization` header, confirm `[REDACTED]` in log output (LOG-S06)

## Work-Unit Commits

| # | Commit Message | Files |
|---|---------------|-------|
| 1 | `feat(logging): add nestjs-pino with CLS correlation and redaction` | package.json, src/common/logger.ts, src/config/env.validation.ts, src/app/app.module.ts, src/main.ts, test/jest.setup.ts, src/common/__tests__/logger.spec.ts, test/logger-integration.spec.ts |
| 2 | `refactor(logging): replace CustomLogger with DI-injected pino Logger` | 11 service/controller/repository/listener files, 3 bare-Logger files, transaction.ts, password-strength.validator.ts, microservice-provider.ts, 4 seed files |
| 3 | `chore(logging): remove CustomLogger and verify structured output` | (deletion already in commit 1 — this commit is verification only, squash if empty) |
