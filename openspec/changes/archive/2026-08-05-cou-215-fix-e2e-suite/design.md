# Design: Fix Broken E2E Test Harness

## Technical Approach

Four independent harness fixes, each targeting a pre-existing infrastructure gap. No production code changes. All modifications are additive or value-replacement — the existing 7 passing specs serve as the regression baseline.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Seed via `createTestApp()` vs globalSetup | In-app seeding runs per-suite (overhead); globalSetup runs once | **globalSetup** — idempotent seed methods make once-per-run safe and cheaper |
| Admin seed: `UserService.createWithRole()` vs direct DB insert | Service uses proper validation + hashing; direct insert is faster but skips hooks | **UserService.createWithRole()** — follows existing codebase patterns, ensures password is correctly hashed |
| Admin seed: upsert vs try/catch | Upsert is cleaner; try/catch reuses existing uniqueness error handling | **Try/catch with `EMAIL_ALREADY_EXISTS`** — simpler, the admin user should be stable; if it exists, return it |

## Data Flow

```
global-setup.ts           jest.setup.ts              Spec files
────────────────         ──────────────              ──────────
                         Set env vars (rate
                         limits: 20/30/15)
                             │
Create NestJS                  │
ApplicationContext ────────────┤
    │                          │
seedDefaultPermissions()       │
seedDefaultRoles()             │
    │                          │
close() ───────────────────────┤
                               │
                               ▼
                    createTestApp() ◄──── 4 i18n specs
                         │                 (migrated from Express)
                         │
                    FastifyAdapter
                         │
                    seedAdminForE2E(app)
                         │                 ◄──── specs needing auth
                    adminUser + token
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `test/e2e/i18n/auth-flows.e2e-spec.ts` | Modify | Replace Express bootstrap with `createTestApp()` |
| `test/e2e/i18n/error-messages.e2e-spec.ts` | Modify | Replace Express bootstrap with `createTestApp()` |
| `test/e2e/i18n/language-detection.e2e-spec.ts` | Modify | Replace Express bootstrap with `createTestApp()` |
| `test/e2e/i18n/validation-messages.e2e-spec.ts` | Modify | Replace Express bootstrap with `createTestApp()` |
| `test/helpers/seed-admin.ts` | Create | `seedAdminForE2E(app)` — idempotent admin user via `UserService.createWithRole()` |
| `test/jest.setup.ts` | Modify | Raise 4 rate-limit env vars (LOGIN=20, REGISTER=30, THROTTLE=30, FORGOT_PASSWORD=15) |
| `test/global-setup.ts` | Create | Bootstrap NestJS context, seed roles + permissions, close |
| `test/jest-e2e.json` | Modify | Add `"globalSetup": "./global-setup.ts"` |

## Interfaces / Contracts

### seedAdminForE2E

```typescript
// test/helpers/seed-admin.ts
import { INestApplication } from '@nestjs/common';
import { UserService } from '../../src/user/service/user.service';
import { UserRole } from '../../src/user/entities/user.entity';

export interface AdminSeedResult {
  adminUser: { email: string; userName: string; password: string };
  adminToken: string;
}

export async function seedAdminForE2E(app: INestApplication): Promise<AdminSeedResult>;

export const ADMIN_CREDENTIALS = {
  email: 'admin-e2e@countergank.test',
  userName: 'admin-e2e',
  password: 'AdminE2E!Test1',
  role: UserRole.ADMIN,
};
```

### Before/After (Fastify migration)

**Before** (auth-flows.e2e-spec.ts — same pattern in all 4 files):
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app/app.module';
// ...
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
```

**After**:
```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';
// ...
    app = await createTestApp();
```

### globalSetup contract

```typescript
// test/global-setup.ts — Jest globalSetup
// Runs ONCE before all e2e suites.
// Uses ts-node/register to enable TypeScript in globalSetup context.
// Calls PermissionService.seedDefaultPermissions() then RoleService.seedDefaultRoles().
// Both methods are idempotent (check countDocuments() first).
export default async function (): Promise<void>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `seedAdminForE2E` idempotency | Verify second call returns same user, no duplicate |
| Integration | `global-setup.ts` bootstrap | Confirm roles/permissions collections are non-empty after setup |
| E2E | All 4 i18n suites + auth specs | `make test:e2e` — green: 0 failures, 0 errors |
| E2E | Rate limits | Parallel run of 9 suites with `--maxWorkers=50%` must not exhaust limits |
| E2E | Admin auth | Specs calling admin-protected endpoints must receive 200, not 401/403 |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary in scope. All changes are test-harness configuration and test-helper additions.

## Migration / Rollout

No migration required. Changes are additive or value-replacements in test infrastructure. Rollback: revert `jest.setup.ts` values, delete `seed-admin.ts` and `global-setup.ts`, revert 4 i18n specs to their Express bootstrap.

## Open Questions

- [ ] Confirm `ts-node` works in Jest `globalSetup` context, or fall back to compiled JS with `require()` of `dist/` modules
