# Changelog: COU-141 — ParameterService

## Summary

Created `AppConfigService`, a centralized, typed configuration service wrapping NestJS `ConfigService`. Migrated `email.listener.ts` and `email.service.ts` from direct `process.env` access to DI-injected config.

## Changes

### New Files
- `src/config/app-config.service.ts` — Global injectable `AppConfigService` with typed getters for `frontendUrl`, `emailProvider`, and `throttle`

### Modified Files
- `src/config/env.validation.ts` — Added `export` to `EnvironmentVariables` class and `Environment` enum
- `src/email/listeners/email.listener.ts` — Injected `AppConfigService`, replaced 4× `process.env.FRONTEND_URL` with `this.config.frontendUrl`
- `src/email/service/email.service.ts` — Injected `AppConfigService`, replaced `process.env.EMAIL_PROVIDER` with `this.config.emailProvider`

### New Tests
- `app-config.service.spec.ts` — 22 unit tests verifying each typed getter returns correct values from mocked `ConfigService`

## Test Results
- **445 total tests passing** (22 new + 423 existing)
- Lint: clean

## Architecture Decision
- Single global `AppConfigService` chosen over multiple group services — matches existing single-`ConfigService` injection pattern
- `@Global()` decorator eliminates need for per-module imports
- Decorator contexts (`@Throttle()`) and standalone utilities excluded (Phase 2 scope)
