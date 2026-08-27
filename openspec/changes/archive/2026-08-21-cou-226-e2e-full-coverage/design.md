# Design: COU-226 — Full E2E Coverage + Local Runbook

## Technical Approach

Additive e2e-only change: 5 new spec files + 4 extended specs + health spec + docs. No `src/` changes. Every spec reuses the ETH harness — `createTestApp()` (Fastify), `seedAdminForE2E()` (ADMIN), `jest.setup.ts` elevated rate limits, `waitForAuditLogEntry` where async audit rows are asserted. Admin specs seed admin; non-admin scenarios register → verify-email → login a USER. State-mutating specs (parameters, templates) isolate via unique keys + teardown.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| D1 | Email "stub" assertion | Assert HTTP 201 + `{status:'queued'}` only | Mock SMTP / assert no SMTP call | `EMAIL_ENABLED` is not read anywhere in `src/`; `sendBySlug`/`sendDirect` return `queued` synchronously, real send is fire-and-forget `EventEmitter2` (errors swallowed+logged). Only deterministic surface is the response. |
| D2 | Auth token acquisition | Read token from user doc via `app.get(UserService)` seam | Email interception / test-only route | Tokens (`resetPasswordToken`, `pendingEmailToken`, `emailVerificationToken`) persist on the user doc; `findByEmail` exposes them. No SMTP interception needed. |
| D3 | Parameter isolation | Non-env param `RESEND_FROM_EMAIL` for update; restore via `ParameterService.set/delete` in `afterAll` | Wipe Redis per suite | Values persist in Redis (`param:*`); env-overridden params (throttle/email) reject 409. Restore keeps runs idempotent. |
| D4 | Template cleanup | Unique slugs `e2e-{Date.now()}` + DELETE teardown; never touch seeded defaults | DB drop per suite | Defaults (`welcome`, etc.) seeded at `EmailModule.onModuleInit`; shared rows must not be deleted. |
| D5 | Non-admin token | register → verify-email → login (rbac pattern) | reuse seed-admin | `seedAdminForE2E` only mints ADMIN; register yields USER role. |
| D6 | Admin-users placement | New `test/e2e/user/admin-users.e2e-spec.ts` | Extend admin-crud-pagination | POST + GET/:id are a distinct AU concern; keeps files reviewable. |

## Data Flow

```
seed-admin / register ──▶ JWT ──▶ endpoint (JwtAuthGuard [+ RolesGuard ADMIN])
                                  │
    parameter write ──▶ Redis param:* (L1 cache per app instance)
    template write  ──▶ Mongo email_templates
    token write     ──▶ Mongo users.{resetPasswordToken,pendingEmailToken}
    email event     ──▶ EventEmitter2 ─▶ SmtpProvider (background, swallowed)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `test/e2e/email-templates/email-templates.e2e-spec.ts` | Create | ET-01..06 CRUD: 201/409/200/404/204, 401/403 |
| `test/e2e/email/email.e2e-spec.ts` | Create | EM-01..04: send/send-direct → 201 queued; 404 missing slug; 401/403 |
| `test/e2e/parameters/parameters.e2e-spec.ts` | Create | S1-S11: list/group/update, 409 env, 404, 422, 401/403, 429 |
| `test/e2e/i18n-admin/i18n-admin.e2e-spec.ts` | Create | I18N-A01/A02: reload → 200; 401; any-role 200 |
| `test/e2e/auth/auth.e2e-spec.ts` | Modify | Add reset-password, confirm-email-change, resend-verification |
| `test/e2e/user/user-profile.e2e-spec.ts` | Modify | Add POST /users/change-email (4 scenarios) |
| `test/e2e/user/admin-users.e2e-spec.ts` | Create | AU-01/AU-02: create 201/409/400/403, get 200/404/400/401 |
| `test/e2e/rbac/rbac.e2e-spec.ts` | Modify | Add PUT /roles/:id/permissions |
| `test/e2e/app/health.e2e-spec.ts` | Create | GET /health → 200 status ok, database+redis up, public |
| `README.md` | Modify | "Testing" section |
| `docs/e2e-testing.md` | Create | Runbook |

## Interfaces / Contracts

Token read seam (no new code):
```ts
const userService = app.get(UserService);
const u = await userService.findByEmail(email); // u.resetPasswordToken / u.pendingEmailToken
```
Parameter restore seam:
```ts
await app.get(ParameterService).set('RESEND_FROM_EMAIL', original);
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| E2E auth | reset/confirm/resend | forgot-password → read token → reset-password; change-email → read pendingEmailToken → confirm-email-change; register → resend-verification |
| E2E email | queued stub | 201 + `{status:'queued'}`; no SMTP assertion |
| E2E state | isolation | unique slugs + afterAll restore/delete; bounded poll only where audit rows are asserted |
| E2E docs | runbook accuracy | commands verified against `package.json` + docker-compose |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Change is test specs + markdown only.

## Migration / Rollout

No migration. Rollback = revert branch (additive only).

## Open Questions

- [ ] **Route mismatch (auth-login)** — spec says `POST /auth/reset-password` (request) + `/auth/reset-password/confirm`; code is `POST /auth/forgot-password` + `POST /auth/reset-password`. Correct spec or follow code?
- [ ] **RBAC 403 for non-admin** — `RoleController.updatePermissions` has only `@UseGuards(JwtAuthGuard)` (no RolesGuard/ADMIN); non-admin returns 200, not 403. Spec correction or add guard (out of scope)?
- [ ] **resend-verification "already verified → 400"** — `AuthService.resendVerification` has no verified check; always 200. Spec correction or code change?
- [ ] **429 rate-limit (S9/S10)** — needs 11 PUTs in 60s vs `@Throttle(limit:10)`; flaky-prone. Keep or drop?
