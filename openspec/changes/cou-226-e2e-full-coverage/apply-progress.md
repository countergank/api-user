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
- **Result**: ⏸️ Blocked — infrastructure unavailable (MongoDB + Redis not running in WSL)
- **Prerequisite**: `docker compose up` required before tests can run

### TDD Evidence
| Task | Tests | RED | GREEN | TRIANGULATE |
|------|-------|-----|-------|-------------|
| 1.1 | 24 | ✅ Written | ⏸️ Blocked | ✅ 24 scenarios |
| 1.2 | 10 | ✅ Written | ⏸️ Blocked | ✅ 10 scenarios |

### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command | `npx jest test/e2e/email-templates test/e2e/email --config ./test/jest-e2e.json --runInBand --forceExit` → Blocked (Mongo timeout) |
| Runtime harness | `docker compose up` → Docker not available in WSL |
| Rollback boundary | Delete the 2 new spec files; no src/ changes |

### Remaining Tasks
- [ ] 2.1 Parameters + i18n-admin specs (PR 2)
- [ ] 2.2 i18n-admin specs (PR 2)
- [ ] 3.1 Auth + user-profile extensions (PR 3)
- [ ] 3.2 User-profile change-email (PR 3)
- [ ] 3.3 Admin-users specs (PR 3)
- [ ] 4.1 RBAC PUT permissions (PR 4)
- [ ] 4.2 Health spec (PR 4)
- [ ] 5.1 Docs + runbook (PR 5)
- [ ] 5.2 Full green gate (PR 5)
