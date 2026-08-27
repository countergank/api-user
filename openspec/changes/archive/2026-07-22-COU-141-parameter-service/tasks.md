# Tasks: COU-141 — ParameterService

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 90–130 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Export type + create service + migrate email files + tests | PR 1 | Single self-contained PR |

## Phase 1: Foundation

- [x] 1.1 Add `export` to `EnvironmentVariables` class in `src/config/env.validation.ts` — change `class EnvironmentVariables` to `export class EnvironmentVariables`
- [x] 1.2 Add `export` to `Environment` enum in `src/config/env.validation.ts`

## Phase 2: Core Implementation

- [x] 2.1 Create `src/config/app-config.service.ts` with `@Injectable()` `AppConfigService` class wrapping `ConfigService`
- [x] 2.2 Add typed getter `get frontendUrl(): string` returning `this.config.get<string>('FRONTEND_URL')`
- [x] 2.3 Add typed getter `get emailProvider(): string` returning `this.config.get<string>('EMAIL_PROVIDER') ?? 'smtp'`
- [x] 2.4 Add grouped getter `get throttle()` returning `{ ttl: string; limit: string }` for generic throttle config
- [x] 2.5 Register `AppConfigService` as `@Global()` in `AppConfigModule` — create module in same file or new `src/config/app-config.module.ts`

## Phase 3: Integration

- [x] 3.1 In `src/email/listeners/email.listener.ts`: inject `AppConfigService`, replace 4× `process.env.FRONTEND_URL` with `this.config.frontendUrl`
- [x] 3.2 In `src/email/service/email.service.ts`: inject `AppConfigService`, replace `process.env.EMAIL_PROVIDER` in `getProviderName()` with `this.config.emailProvider`

## Phase 4: Testing

- [x] 4.1 Write unit test for `AppConfigService` — verify each getter returns correct value from mocked `ConfigService`
- [x] 4.2 Verify existing `email.listener` tests pass after migration (update mocks from `process.env` to `AppConfigService`)
- [x] 4.3 Verify existing `email.service` tests pass after migration

## Phase 5: Verification

- [x] 5.1 Run `npm test` — all tests pass
- [x] 5.2 Run `npm run lint` — no lint errors in modified files
- [x] 5.3 Verify `EnvironmentVariables` type is importable from `src/config/env.validation.ts`
