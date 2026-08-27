# Tasks: fix-e2e-suite

## Task Groups

| Group | Fix | Tasks | Complexity |
|-------|-----|-------|------------|
| A | Fastify adapter migration (4 i18n specs) | T1 | S |
| B | Admin seed helper | T2 | M |
| C | Elevated rate-limit thresholds | T3 | S |
| D | DB prerequisites: roles + permissions seed | T4 | M |

---

## T1 — Fastify adapter migration for 4 i18n specs

**ID:** T1
**Title:** Replace Express bootstrap with `createTestApp()` in i18n e2e specs
**Complexity:** S
**Dependencies:** None
**Status:** ✅ COMPLETE

### Acceptance Criteria
- [x] `test/e2e/i18n/auth-flows.e2e-spec.ts` uses `createTestApp()` instead of `Test.createTestingModule` + `createNestApplication()`
- [x] `test/e2e/i18n/error-messages.e2e-spec.ts` uses `createTestApp()` instead of Express bootstrap
- [x] `test/e2e/i18n/language-detection.e2e-spec.ts` uses `createTestApp()` instead of Express bootstrap
- [x] `test/e2e/i18n/validation-messages.e2e-spec.ts` uses `createTestApp()` instead of Express bootstrap
- [x] Unused imports (`Test`, `TestingModule`, `ValidationPipe`, `AppModule`) are removed from all 4 files
- [x] Each spec initializes via `app = await createTestApp()` and tears down via `await app.close()`
- [x] `AuditInterceptor` does not crash on `response.raw.on('finish')` (implicit: Fastify adapter ensures this)

### Files Affected
- `test/e2e/i18n/auth-flows.e2e-spec.ts` — Modify
- `test/e2e/i18n/error-messages.e2e-spec.ts` — Modify
- `test/e2e/i18n/language-detection.e2e-spec.ts` — Modify
- `test/e2e/i18n/validation-messages.e2e-spec.ts` — Modify

### Verification
- Focused test: `npx jest --config ./test/jest-e2e.json --forceExit test/e2e/i18n/`
- All 4 suites pass individually and together
- No `TypeError: response.raw.on is not a function` in output

### Rollback
- Revert imports and bootstrap in all 4 files to `Test.createTestingModule` + `createNestApplication()` pattern

---

## T2 — Admin seed helper

**ID:** T2
**Title:** Create `seedAdminForE2E()` helper that provides an admin-authenticated user
**Complexity:** M
**Dependencies:** T4 (roles must exist for `UserRole.ADMIN` assignment)
**Status:** ✅ COMPLETE

### Acceptance Criteria
- [x] `test/helpers/seed-admin.ts` exists and exports `seedAdminForE2E(app)` and `ADMIN_CREDENTIALS`
- [x] Calling `seedAdminForE2E(app)` from a spec's `beforeAll` creates an admin user with `UserRole.ADMIN`
- [x] Returns `AdminSeedResult { adminUser, adminToken }` where `adminToken` is a valid JWT
- [x] Calling the helper twice is idempotent — second call returns the same user, no `ENTITY_EMAIL_ALREADY_EXISTS` error
- [x] Admin credentials use a stable test-only email (`admin-e2e@countergank.test`)
- [x] Admin user is created via `UserService.createWithRole()` (proper password hashing)
- [x] Token is obtained via `POST /auth/login` with seeded credentials

### Files Affected
- `test/helpers/seed-admin.ts` — Create

### Implementation Contract
```typescript
// test/helpers/seed-admin.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserService } from '../../src/user/service/user.service';
import { UserRole } from '../../src/user/entities/user.entity';

export interface AdminSeedResult {
  adminUser: { email: string; userName: string; password: string };
  adminToken: string;
}

export const ADMIN_CREDENTIALS = {
  email: 'admin-e2e@countergank.test',
  userName: 'admin-e2e',
  password: 'AdminE2E!Test1',
  role: UserRole.ADMIN,
};

export async function seedAdminForE2E(app: INestApplication): Promise<AdminSeedResult> {
  const userService = app.get(UserService);
  const { email, userName, password, role } = ADMIN_CREDENTIALS;

  try {
    await userService.createWithRole({
      email,
      userName,
      password,
      name: 'Admin',
      lastName: 'E2E',
      role,
      permissions: [],
      isActive: true,
    });
  } catch (error: any) {
    if (error?.kind !== 'ENTITY_EMAIL_ALREADY_EXISTS') throw error;
  }

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return {
    adminUser: { email, userName, password },
    adminToken: loginResponse.body.accessToken,
  };
}
```

### Verification
- Unit: `seedAdminForE2E` called twice within same app — second call does not throw, returns same credentials
- Integration: Admin token passes JWT guard on admin-only endpoint (e.g. `GET /admin/parameters`)
- E2E: Specs using `seedAdminForE2E` in `beforeAll` receive `200` on admin-only routes, not `401` or `403`

### Rollback
- Delete `test/helpers/seed-admin.ts`

---

## T3 — Elevated rate-limit thresholds

**ID:** T3
**Title:** Raise rate-limit env vars in `jest.setup.ts` for parallel e2e execution
**Complexity:** S
**Dependencies:** None
**Status:** ✅ COMPLETE

### Acceptance Criteria
- [x] `LOGIN_THROTTLE_LIMIT` = 20 (was 3)
- [x] `REGISTER_THROTTLE_LIMIT` = 30 (was 3)
- [x] `THROTTLE_LIMIT` = 30 (was 5)
- [x] `FORGOT_PASSWORD_THROTTLE_LIMIT` = 15 (was 3)
- [x] All TTL values remain at 60
- [x] Production defaults in `.env` files are unchanged
- [x] 38 e2e specs run in parallel without `429 Too Many Requests`

### Files Affected
- `test/jest.setup.ts` — Modify (4 value changes)

### Verification
- Focused test: `make test:e2e` — grep output for `429` to confirm zero occurrences
- All 38 specs must pass without rate-limit interference

### Rollback
- Revert the 4 env var values to their previous numbers (3, 3, 5, 3)

---

## T4 — DB prerequisites: seed roles and permissions

**ID:** T4
**Title:** Create Jest `globalSetup` that seeds roles and permissions before any e2e suite runs
**Complexity:** M
**Dependencies:** None
**Status:** ✅ COMPLETE

### Acceptance Criteria
- [x] `test/global-setup.ts` exists and exports a default async function
- [x] Uses `ts-node/register` for TypeScript support in globalSetup context
- [x] Bootstraps a NestJS `ApplicationContext` via `NestFactory.createApplicationContext(AppModule)`
- [x] Calls `PermissionService.seedDefaultPermissions()` then `RoleService.seedDefaultRoles()`
- [x] Both seed methods are idempotent (`countDocuments()` check before insert)
- [x] Context is closed after seeding
- [x] `test/jest-e2e.json` includes `"globalSetup": "./global-setup.ts"`
- [x] `roles` collection contains ADMIN, USER, VIEWER after setup
- [x] `permissions` collection contains all 12 default permissions after setup
- [x] If collections are already populated, run is a no-op

### Files Affected
- `test/global-setup.ts` — Create
- `test/jest-e2e.json` — Modify (add `globalSetup` field)

### Implementation Contract
```typescript
// test/global-setup.ts
require('ts-node/register');

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { PermissionService } from '../src/rbac/services/permission.service';
import { RoleService } from '../src/rbac/services/role.service';

export default async function (): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const permissionService = app.get(PermissionService);
  const roleService = app.get(RoleService);

  await permissionService.seedDefaultPermissions();
  await roleService.seedDefaultRoles();

  await app.close();
}
```

### Verification
- Focused test: Run a spec that needs RBAC guards in isolation — confirm roles/permissions exist
- Integration: After globalSetup, query MongoDB `roles` and `permissions` collections — both non-empty
- Idempotency: Run `make test:e2e` twice — second run does not duplicate seed data
- `jest-e2e.json` JSON is valid after addition

### Rollback
- Delete `test/global-setup.ts`
- Remove `"globalSetup"` key from `test/jest-e2e.json`

---

## Dependency Graph

```
T3 (rate limits) ─┐
                   ├──► ALL PARALLEL (no sequential dependency)
T4 (DB seed) ─────┤
                   │
T1 (Fastify) ─────┘
                   │
                   └──► T2 (admin seed) depends on T4 (roles must exist)
```

**Parallel:** T1, T3, T4 can start simultaneously.
**Sequential:** T2 depends on T4 (admin user creation assigns `UserRole.ADMIN` which requires roles collection to exist).

---

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| Total estimated changed lines | ~160 authored lines |
| 800-line budget risk | **Low** |
| Chained PRs recommended | **No** — single PR, well under 400-line threshold |
| Decision needed before apply | **No** — no open questions block implementation |

### Line-count breakdown

| Task | Lines | Type |
|------|-------|------|
| T1 (4 i18n specs) | ~60 | Modify (remove ~16 lines each, add ~4 lines each) |
| T2 (seed-admin.ts) | ~55 | Create |
| T3 (jest.setup.ts) | 4 | Modify (value replacements) |
| T4 (global-setup.ts + jest-e2e.json) | ~42 | Create + 1-line modify |
| **Total** | **~161** | |

---

## Implementation Order

1. **Phase 1 (parallel):** T1 + T3 + T4 (all independent)
2. **Phase 2:** T2 (depends on T4 roles being seeded)
3. **Phase 3:** Run `make test:e2e` — all 38 specs must pass
