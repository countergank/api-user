# Apply Progress: COU-226 — Full E2E Coverage + Local Runbook

## Slice 1: Email Domain (PR 1)

### Completed Tasks
- [x] 1.1 Create `test/e2e/email-templates/email-templates.e2e-spec.ts` — 24 tests covering ET-01..ET-06 (CRUD + auth guards)
- [x] 1.2 Create `test/e2e/email/email.e2e-spec.ts` — 10 tests covering EM-01..EM-04 (send/send-direct + auth guards)

### Files Written
| File | Lines | Description |
|------|-------|-------------|
| `test/e2e/email-templates/email-templates.e2e-spec.ts` | ~230 | EmailTemplateController CRUD e2e: create/list/get/update/delete + 401/403 |
| `test/e2e/email/email.e2e-spec.ts` | ~130 | EmailController send/send-direct e2e: 201 queued + 404 + 401/403 |

### Test Results
- **Command**: `npx jest test/e2e/email-templates test/e2e/email --config ./test/jest-e2e.json --runInBand --forceExit`
- **Result**: Blocked — infrastructure unavailable (MongoDB + Redis not running in WSL)
- **Prerequisite**: `docker compose up` required before tests can run

### TDD Evidence
| Task | Tests | RED | GREEN | TRIANGULATE |
|------|-------|-----|-------|-------------|
| 1.1 | 24 | Written | Blocked | 24 scenarios |
| 1.2 | 10 | Written | Blocked | 10 scenarios |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command | `npx jest test/e2e/email-templates test/e2e/email --config ./test/jest-e2e.json --runInBand --forceExit` → Blocked (Mongo timeout) |
| Runtime harness | `docker compose up` → Docker not available in WSL |
| Rollback boundary | Delete the 2 new spec files; no src/ changes |

## Slice 2: Parameters + I18n Admin (PR 2)

### Completed Tasks
- [x] 2.1 Create `test/e2e/parameters/parameters.e2e-spec.ts` — 18 tests covering S1-S8, S11 (list, group filter, update, 404, 422, 409, 401, 403)
- [x] 2.2 Create `test/e2e/i18n-admin/i18n-admin.e2e-spec.ts` — 3 tests covering I18N-A01/A02 (reload 200, 401, any-role 200)

### Files Written
| File | Lines | Description |
|------|-------|-------------|
| `test/e2e/parameters/parameters.e2e-spec.ts` | ~283 | ParameterAdminController e2e: list/group/update + auth guards + error codes |
| `test/e2e/i18n-admin/i18n-admin.e2e-spec.ts` | ~75 | I18nAdminController reload e2e: 401 + 200 admin + 200 any-role |

### Test Results
- **Command**: `npx jest test/e2e/parameters test/e2e/i18n-admin --config ./test/jest-e2e.json --runInBand --forceExit`
- **Result**: Blocked — global-setup MongoDB connection timeout (Server selection timed out after 10000ms), Redis ETIMEDOUT
- **TypeScript**: `npx tsc --noEmit --incremental false` → EXIT 0 (all specs compile)

### TDD Evidence
| Task | Tests | RED | GREEN | TRIANGULATE |
|------|-------|-----|-------|-------------|
| 2.1 | 18 | Written | Blocked (infra) | 18 scenarios (string/number/bool update, 404, 422, 409, 401, 403) |
| 2.2 | 3 | Written | Blocked (infra) | 3 scenarios (401, 200 admin, 200 non-admin) |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command | `npx jest test/e2e/parameters test/e2e/i18n-admin --config ./test/jest-e2e.json --runInBand --forceExit` → Blocked (Mongo timeout, Redis ETIMEDOUT) |
| Runtime harness | `docker compose up` → Docker not available in WSL |
| Rollback boundary | Delete `test/e2e/parameters/`, `test/e2e/i18n-admin/`; no src/ changes |

## Slice 3: Auth + User (PR 3)

### Completed Tasks
- [x] 3.1 Extend `test/e2e/auth/auth.e2e-spec.ts` — reset-password (valid token 200, invalid 400 UA-AUTH-005), confirm-email-change (valid 200, invalid 400 UA-AUTH-007), resend-verification (always 200)
- [x] 3.2 Extend `test/e2e/user/user-profile.e2e-spec.ts` — change-email 200, 409 UA-USR-004 duplicate, 401
- [x] 3.3 Extend `test/e2e/user/admin-crud-pagination.e2e-spec.ts` — AU-01 create 201/409/400/403/401, AU-02 GET by ID 200/404/400/403/401

### Files Modified/Written
| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `test/e2e/auth/auth.e2e-spec.ts` | Modified | ~230 | Added reset-password, confirm-email-change, resend-verification tests |
| `test/e2e/user/user-profile.e2e-spec.ts` | Modified | ~130 | Added change-email tests (200, 409, 401) |
| `test/e2e/user/admin-crud-pagination.e2e-spec.ts` | Modified | ~310 | Added AU-01 create + AU-02 get-by-id tests with admin/non-admin auth |

### Test Results
- **Command**: `npx jest test/e2e/auth test/e2e/user --config ./test/jest-e2e.json --runInBand --forceExit`
- **Result**: Blocked — same infrastructure issue (MongoDB + Redis unavailable)
- **TypeScript**: `npx tsc --noEmit --incremental false` → EXIT 0 (all specs compile)

### TDD Evidence
| Task | Tests | RED | GREEN | TRIANGULATE |
|------|-------|-----|-------|-------------|
| 3.1 | 8 | Written | Blocked (infra) | reset (valid/invalid/consumed), confirm (valid/invalid/consumed), resend (existing/nonexistent) |
| 3.2 | 3 | Written | Blocked (infra) | change-email 200, 409 duplicate, 401 |
| 3.3 | 12 | Written | Blocked (infra) | create 201/409x2/400x2/403/401, get-by-id 200/404/400/403/401 |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command | `npx jest test/e2e/auth test/e2e/user --config ./test/jest-e2e.json --runInBand --forceExit` → Blocked (Mongo timeout) |
| Runtime harness | `docker compose up` → Docker not available in WSL |
| Rollback boundary | Revert edits to auth.e2e-spec.ts, user-profile.e2e-spec.ts, admin-crud-pagination.e2e-spec.ts; no src/ changes |

## Slice 4: RBAC + Health (PR 4)

### Completed Tasks
- [x] 4.1 Extend `test/e2e/rbac/rbac.e2e-spec.ts` — PUT /roles/:id/permissions: admin 200, non-admin 403, unauthenticated 401, unknown role 500 (controller null-check bug)
- [x] 4.2 Create `test/e2e/app/health.e2e-spec.ts` — GET /health: status ok, db/redis details, public endpoint, JSON content-type

### Files Written/Modified
| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `test/e2e/rbac/rbac.e2e-spec.ts` | Modified | ~50 | Added PUT /roles/:id/permissions tests (4 scenarios) |
| `test/e2e/app/health.e2e-spec.ts` | Created | ~45 | Health check e2e: 200 status ok, db/redis details, public, JSON |

### Test Results
- **Command**: `npx jest test/e2e/rbac test/e2e/app/health --config ./test/jest-e2e.json --runInBand --forceExit`
- **Result**: Blocked — same infrastructure issue (MongoDB + Redis unavailable)
- **TypeScript**: `npx tsc --noEmit --incremental false` → EXIT 0 (all specs compile)

### TDD Evidence
| Task | Tests | RED | GREEN | TRIANGULATE |
|------|-------|-----|-------|-------------|
| 4.1 | 4 | Written | Blocked (infra) | admin 200, non-admin 403, unauthenticated 401, unknown role 500 |
| 4.2 | 4 | Written | Blocked (infra) | status ok, db/redis details, public, JSON content-type |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command | `npx jest test/e2e/rbac test/e2e/app/health --config ./test/jest-e2e.json --runInBand --forceExit` → Blocked (Mongo timeout) |
| Runtime harness | `docker compose up` → Docker not available in WSL |
| Rollback boundary | Revert rbac.e2e-spec.ts edits; delete health.e2e-spec.ts; no src/ changes |

## Slice 5: Docs + Green Gate (PR 5)

### Completed Tasks
- [x] 5.1 Add README "Testing" section + create `docs/e2e-testing.md` runbook

### Files Written/Modified
| File | Action | Lines | Description |
|------|--------|-------|-------------|
| `README.md` | Modified | ~15 | Added Testing section with command table and prerequisites |
| `docs/e2e-testing.md` | Created | ~100 | Full e2e runbook: prerequisites, env vars, commands, CI notes, troubleshooting |

### Remaining
- [ ] 5.2 Full green gate — deferred to orchestrator when Docker is up

## Cumulative Summary

### All Completed Tasks (Slices 1-5)
- [x] 1.1 Email templates e2e (24 tests)
- [x] 1.2 Email send e2e (10 tests)
- [x] 2.1 Parameters e2e (18 tests)
- [x] 2.2 I18n admin e2e (3 tests)
- [x] 3.1 Auth extensions e2e (8 tests)
- [x] 3.2 User profile change-email e2e (3 tests)
- [x] 3.3 Admin users create + get-by-id e2e (12 tests)
- [x] 4.1 RBAC PUT permissions e2e (4 tests)
- [x] 4.2 Health check e2e (4 tests)
- [x] 5.1 Docs + runbook (2 files)

### Total Tests Written: 86
### Tests Passing: 0 (infrastructure unavailable — Docker/Mongo/Redis not running)
### TypeScript Compilation: EXIT 0 (all specs compile cleanly)

### Remaining Tasks
- [ ] 5.2 Full green gate (PR 5) — run `npm run test:e2e -- --runInBand` when Docker is up
