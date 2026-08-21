# Proposal: COU-226 — Full E2E Coverage + Local Runbook

## Intent

21 of 37 HTTP endpoints have no e2e coverage; 4 controllers have zero coverage (EmailTemplate, ParameterAdmin, Email, I18nAdmin). Local e2e is undocumented (2-line README; Mongo/Redis prerequisites unstated). This change closes the gaps and adds a runbook so `npm run test:e2e` is reproducible.

## Scope

### In Scope
- New e2e specs under `test/e2e/{domain}/` for 21 uncovered endpoints, reusing `createTestApp()`, `seed-admin`, elevated rate limits, bounded `audit-poll`.
- Docs: README "Testing" section + `docs/e2e-testing.md` runbook (prereqs `docker compose up` Mongo+Redis, env vars, commands).
- 5 new domain specs + 4 delta specs (see Capabilities).

### Out of Scope
- `POST /message-microservice/:pattern` — example stub, `EXAMPLE_MICROSERVICE_ENABLED=false`. **Recommend SKIP** (no real value).
- Unit-test coverage; CI trigger already fixed in a prior change.

## Capabilities

### New Capabilities
- `email-templates`: EmailTemplateController CRUD (POST/GET/GET :slug/PATCH/DELETE `/email/templates`) — JwtAuthGuard + ADMIN.
- `parameters`: ParameterAdminController (GET list, GET :group, PUT :key `/admin/parameters`) — ADMIN. Reconcile with unarchived `parameter-admin` delta.
- `email`: EmailController `/email/send`, `/email/send-direct` — ADMIN, `EMAIL_ENABLED=false` stub.
- `i18n-admin`: I18nAdminController `POST /admin/i18n/reload` — JwtAuthGuard.
- `admin-users`: `POST /admin/users` (create), `GET /admin/users/:id` — ADMIN (complements admin-user-* family; unlock already in `account-lockout`).

### Modified Capabilities
- `auth-login`: add reset-password, confirm-email-change, resend-verification.
- `user-profile`: add change-email (`POST /users/change-email`).
- `rbac`: add `PUT /roles/:id/permissions`.
- `health-check`: e2e coverage for `GET /health` only (requirements unchanged; no requirement delta).

## Approach

Follow the existing harness (ETH-01..ETH-13). One spec folder per domain under `test/e2e/`. Admin endpoints seed an admin and assert success + 401/403 for non-admin. Email specs assert stubbed/disabled behavior (queue/no-send) when `EMAIL_ENABLED=false`, not real SMTP. Parameter/i18n specs isolate shared runtime state (reset between suites). Docs written after specs, citing real commands.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `test/e2e/email-templates/`, `email/`, `parameters/`, `i18n-admin/` | New | 4 new e2e spec folders (~14 cases) |
| `test/e2e/auth/`, `user/`, `rbac/`, `app/` | Modified | 7 scattered gap cases added |
| `README.md`, `docs/e2e-testing.md` | New/Modified | Local runbook |
| `openspec/specs/*` | New/Modified | 5 new + 4 delta specs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Email endpoints with `EMAIL_ENABLED=false` — stub behavior non-deterministic | Med | Assert queued/disabled response, not SMTP side effects |
| Auth reset/confirm flows need token/email setup | Med | Stub email provider; read token from DB or service seam |
| Parameter/i18n admin mutate shared runtime state → cross-suite leakage | Med | Isolate/reset state per suite; bounded poll pattern |
| 21 new specs inflate suite duration / rate limits | Low | Elevated test rate limits (ETH-05); keep parallel |

## Rollback Plan

Revert the branch — e2e specs and docs are additive; no production code changes expected. If a spec proves flaky, delete that spec file only; no `src` impact.

## Dependencies

- `docker compose up` (MongoDB + Redis) for local e2e.
- Prior change output (stable e2e run + CI trigger) already merged.

## Success Criteria

- [ ] 21 uncovered endpoints have passing e2e tests (0 failures, no flaky audit tests).
- [ ] README + `docs/e2e-testing.md` document prerequisites and commands; a fresh checkout can run e2e.
- [ ] 5 new + 4 delta specs written with Given/When/Then + RFC 2119 keywords.
- [ ] `npm run test:e2e` green locally and on CI.
