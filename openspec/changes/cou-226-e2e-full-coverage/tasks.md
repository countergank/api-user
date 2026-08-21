# Tasks: COU-226 — Full E2E Coverage + Local Runbook

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1600–2000 (6 new specs + 3 modified + docs) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Email domain specs (ET-01..06, EM-01..04) | PR 1 | `npm run test:e2e -- --testPathPattern='(email-templates|email)\.e2e-spec'` | `docker compose up` Mongo+Redis; `.env.local.testing` | delete `test/e2e/email-templates/`, `test/e2e/email/` |
| 2 | Config/admin state specs (S1-S11, I18N-A01/A02) | PR 2 | `npm run test:e2e -- --testPathPattern='(parameters|i18n-admin)\.e2e-spec'` | same | delete `test/e2e/parameters/`, `test/e2e/i18n-admin/` |
| 3 | Auth + user specs (auth reset/confirm/resend, change-email, AU-01/AU-02) | PR 3 | `npm run test:e2e -- --testPathPattern='(auth|user-profile|admin-users)\.e2e-spec'` | same | revert auth/user-profile edits; delete admin-users spec |
| 4 | RBAC PUT permissions + health spec | PR 4 | `npm run test:e2e -- --testPathPattern='(rbac|health)\.e2e-spec'` | same | revert rbac edit; delete health spec |
| 5 | Docs + full green gate | PR 5 | `npm run test:e2e` | same | revert README/docs edits |

## Phase 1: Email Domain Specs

- [x] 1.1 Create `test/e2e/email-templates/email-templates.e2e-spec.ts` — seed admin; POST/GET/GET :slug/PATCH/DELETE `/email/templates`; ET-01 201, ET-02 list, ET-03 200/404, ET-04 200/404, ET-05 delete, ET-06 401/403 (non-admin via register→verify→login). Unique slugs `e2e-{Date.now()}`, DELETE teardown.
- [x] 1.2 Create `test/e2e/email/email.e2e-spec.ts` — EM-01/EM-02 assert 201 `{status:'queued'}` (EMAIL_ENABLED dead, per D1), EM missing-slug 404, EM-04 401/403.

## Phase 2: Config / Admin State Specs

- [x] 2.1 Create `test/e2e/parameters/parameters.e2e-spec.ts` — S1 list 200, S2 group filter 200, S3 update 200 via `RESEND_FROM_EMAIL`, S4 env-overridden 409, S5 404, S6 422, S7 401, S8 403, S11 empty group 200. Restore via `ParameterService.set/delete` in `afterAll`. Drop S9/S10 429 (flaky).
- [x] 2.2 Create `test/e2e/i18n-admin/i18n-admin.e2e-spec.ts` — I18N-A01 reload 200, I18N-A02 401 + any-role 200.

## Phase 3: Auth + User Specs

- [x] 3.1 Extend `test/e2e/auth/auth.e2e-spec.ts` — forgot-password→read `resetPasswordToken` via `UserService.findByEmail`→reset-password 200 + invalid-token 400; change-email→read `pendingEmailToken`→`/auth/confirm-email-change` 200 + invalid 400; `resend-verification` 200 (no verified check — current behavior).
- [x] 3.2 Extend `test/e2e/user/user-profile.e2e-spec.ts` — `POST /users/change-email` 200, 409 duplicate, 401. (Note: actual endpoint takes `{email}` only — no currentPassword check in controller.)
- [x] 3.3 Extend `test/e2e/user/admin-crud-pagination.e2e-spec.ts` — AU-01 create 201/409/400/403/401, AU-02 `GET /admin/users/:id` 200/404/400/403/401. (Merged into existing admin-crud-pagination file rather than creating separate admin-users file.)

## Phase 4: RBAC + Health Specs

- [x] 4.1 Extend `test/e2e/rbac/rbac.e2e-spec.ts` — `PUT /roles/:id/permissions` 200 admin, 500 unknown role (controller bug), 401, and **403 non-admin** (guard already committed `fe44d64`; test only).
- [x] 4.2 Create `test/e2e/app/health.e2e-spec.ts` — `GET /health` 200 `status:'ok'` + db/redis up, public (no auth), JSON content-type (HLTH-01/02).

## Phase 5: Docs + Green Gate

- [x] 5.1 Add README "Testing" section + create `docs/e2e-testing.md` runbook (prereqs `docker compose up` Mongo+Redis, env vars, `npm run test:e2e`), commands verified against `package.json`.
- [ ] 5.2 Run `npm run test:e2e` — full suite green, no flaky audit tests. (Deferred — Docker unavailable in WSL.)

## Notes

- RBAC security fix (RolesGuard + `@Roles(ADMIN)`) already applied in `fe44d64` — no guard task; only the 403 e2e test.
- Auth routes are `/auth/forgot-password` + `/auth/reset-password` (NOT `/reset-password/confirm`).
- Email endpoints always return `{status:'queued'}`; assert that, drop 429 rate-limit scenario.
