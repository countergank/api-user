# Design: COU-223 — Refactor test directory & remove httpyac

## Technical Approach

Restructure the e2e test suite from a flat layout to a domain-organized structure under `test/e2e/{domain}/`, delete dead code (httpyac stub, orphaned configs/specs), replace two flaky `setTimeout` sleeps in audit-logs with a bounded poll helper, and deduplicate `GET /users/profile` tests keeping coverage only in `user-profile.e2e-spec.ts`. All changes are test-only; no application code is touched.

Maps to proposal Approach 2 and satisfies delta spec ETH-08 through ETH-13.

## Architecture Decisions

### Decision: E2e directory layout convention

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Flat `test/*.e2e-spec.ts` | Simple but doesn't scale; no domain grouping | Rejected |
| `test/e2e/{domain}/` with one folder per domain | Clear ownership, scales, matches spec ETH-08 | **Chosen** |
| Keep `test/user/` alongside `test/e2e/user/` | Duplicate domains, violates ETH-08 "no duplicate domain folders" | Rejected |

**Rationale**: Spec ETH-08 mandates one folder per domain under `test/e2e/`. Existing `test/e2e/i18n/` stays; `test/user/admin-crud-pagination.e2e-spec.ts` moves to `test/e2e/user/`; all top-level specs move to their respective domain folders. The `testRegex: ".e2e-spec.ts$"` in `test/jest-e2e.json` collects all files regardless of depth, so no config change needed.

### Decision: audit-poll helper vs fixed sleep

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep `setTimeout(500)` | Simple but flaky; fails when persistence takes >500ms | Rejected |
| Unbounded polling | Could hang forever on real failures | Rejected |
| Bounded poll (5s max, ~100ms interval) with diagnostics | Deterministic, fails fast with actionable info on timeout | **Chosen** |

**Rationale**: Spec ETH-11 requires bounded polling with diagnostics. 5s bound covers CI variance; ~100ms interval balances responsiveness vs load. On timeout, the helper emits elapsed time, attempt count, and last observed response body for debugging.

### Decision: Dedupe profile tests location

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep in auth.e2e-spec.ts | Auth tests cover login flow but profile is a user-domain concern | Rejected |
| Keep in user-profile.e2e-spec.ts only | Single canonical location, matches domain ownership | **Chosen** |

**Rationale**: Spec ETH-12 requires `GET /users/profile` assertions only in `test/e2e/user/user-profile.e2e-spec.ts`. The two tests in `auth.e2e-spec.ts` (200 with token, 401 without) are exact duplicates of tests in `user-profile.e2e-spec.ts`. Removing them reduces e2e count from 70 → 68 without coverage loss.

### Decision: Dead file deletion scope

| File | Reason | Decision |
|------|--------|----------|
| `test/httpyac/` | 3-line stub only; ticket mandate "eliminar httpyac" | **Delete** |
| `jest.e2e.config.js` (root) | Dead config; active is `test/jest-e2e.json` | **Delete** |
| `test/helpers/index.ts` | MongoMemoryReplSet helpers; zero imports in repo | **Delete** |
| `test/helpers/seed-admin.spec.ts` | Never matched by jest (no test env); orphaned | **Delete** |
| `test/i18n/i18n.service.spec.ts` | Duplicate of `src/i18n/i18n.service.spec.ts` | **Delete** |

**Rationale**: Spec ETH-10 requires these deletions. Verified zero imports/references for all five. The transactions spec (`openspec/specs/transactions/spec.md` TX-02) references `test/helpers/index.ts` — will update that reference in this change since we're removing the file.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `test/e2e/app/app.e2e-spec.ts` | Create (git mv) | Moved from `test/app.e2e-spec.ts`; smoke test for GET / |
| `test/e2e/auth/auth.e2e-spec.ts` | Create (git mv) | Moved from `test/auth.e2e-spec.ts`; minus 2 profile tests |
| `test/e2e/audit-logs/audit-logs.e2e-spec.ts` | Create (git mv) | Moved from `test/audit-logs.e2e-spec.ts`; `setTimeout` → `waitForAuditRow()` |
| `test/e2e/rbac/rbac.e2e-spec.ts` | Create (git mv) | Moved from `test/rbac.e2e-spec.ts` |
| `test/e2e/password-strength/password-strength.e2e-spec.ts` | Create (git mv) | Moved from `test/password-strength.e2e-spec.ts` |
| `test/e2e/user/user-profile.e2e-spec.ts` | Create (git mv) | Moved from `test/user-profile.e2e-spec.ts`; canonical profile tests |
| `test/e2e/user/admin-crud-pagination.e2e-spec.ts` | Create (git mv) | Moved from `test/user/admin-crud-pagination.e2e-spec.ts` |
| `test/e2e/i18n/i18n.e2e-spec.ts` | No change | Already in correct location |
| `test/helpers/audit-poll.ts` | Create | New bounded poll helper for audit-log assertions |
| `test/helpers/index.ts` | Delete | Dead MongoMemoryReplSet helpers |
| `test/helpers/seed-admin.spec.ts` | Delete | Orphaned spec, never collected |
| `test/i18n/i18n.service.spec.ts` | Delete | Duplicate of src spec |
| `jest.e2e.config.js` | Delete | Dead root config |
| `test/httpyac/` | Delete | Entire directory (3-line stub) |
| `openspec/specs/transactions/spec.md` | Modify | Update TX-02 scenario reference from `test/helpers/index.ts` to reflect current test infrastructure (real MongoDB via global-setup) |

**Git mv strategy**: Use `git mv` for all moves to preserve history. Example: `git mv test/auth.e2e-spec.ts test/e2e/auth/auth.e2e-spec.ts`.

## Interfaces / Contracts

### `test/helpers/audit-poll.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface PollOptions {
  timeoutMs?: number;      // default 5000
  intervalMs?: number;     // default 100
  label?: string;          // human-readable label for diagnostics
}

export interface PollResult<T> {
  success: boolean;
  value?: T;
  elapsedMs: number;
  attempts: number;
  lastResponse?: unknown;
}

/**
 * Polls a condition until it returns truthy or timeout expires.
 * On timeout, throws with diagnostics: elapsed, attempts, last observed value.
 */
export async function waitForAuditRow<T>(
  app: INestApplication,
  condition: () => Promise<T>,
  options: PollOptions = {}
): Promise<T> {
  const { timeoutMs = 5000, intervalMs = 100, label = 'audit row' } = options;
  const start = Date.now();
  let attempts = 0;
  let lastValue: unknown;

  while (Date.now() - start < timeoutMs) {
    attempts++;
    try {
      const value = await condition();
      if (value) return value;
      lastValue = value;
    } catch (err) {
      lastValue = { error: (err as Error).message };
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }

  const elapsed = Date.now() - start;
  const msg = `waitForAuditRow: ${label} not satisfied within ${timeoutMs}ms (${elapsed}ms elapsed, ${attempts} attempts)`;
  const err = new Error(msg);
  (err as any).diagnostics = { elapsedMs: elapsed, attempts, lastObserved: lastValue, timeoutMs };
  throw err;
}

/**
 * Convenience: polls the admin audit-logs endpoint until a row matching the filter exists.
 */
export async function waitForAuditLogEntry(
  app: INestApplication,
  adminToken: string,
  filter: { action?: string; resource?: string },
  options: PollOptions = {}
): Promise<any> {
  return waitForAuditRow(
    app,
    async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .query(filter)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      return res.body.data.length > 0 ? res.body.data[0] : null;
    },
    { ...options, label: `audit log (action=${filter.action}, resource=${filter.resource})` }
  );
}
```

**Usage in `test/e2e/audit-logs/audit-logs.e2e-spec.ts`**:

```typescript
import { waitForAuditLogEntry } from '../helpers/audit-poll';

// Replace:
await new Promise(r => setTimeout(r, 500));
const response = await request(app.getHttpServer())
  .get('/admin/audit-logs?action=auth.register&resource=auth')
  .set('Authorization', `Bearer ${adminToken}`)
  .expect(200);

// With:
await waitForAuditLogEntry(app, adminToken, { action: 'auth.register', resource: 'auth' });
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `waitForAuditRow` / `waitForAuditLogEntry` | Test with fake time (jest.useFakeTimers) — verify success path, timeout path emits diagnostics, interval respected |
| Integration | Audit-logs e2e specs use poll helper | Replace 2 `setTimeout(500)` calls with `waitForAuditLogEntry`; run e2e suite against real MongoDB/Redis |
| E2E | Full suite green after refactor | `npm run test:e2e -- --runInBand` — expect 68 tests pass (was 70, -2 dupes); audit-logs 2 previously flaky now stable |
| Unit (existing) | No regression | `npm run test:unit` — expect 717 tests pass, 0 failures |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. All changes are test-only.

**Rollback**: `git revert` the single commit. If poll helper introduces regression, revert helper and restore `setTimeout` temporarily while investigating.

## Open Questions

- [ ] Confirm `openspec/specs/transactions/spec.md` TX-02 reference update is in scope for this change (spec says "decide whether to update that doc reference in this change or leave for archive"). Design assumes we update it here for spec accuracy.
- [ ] Verify CI has MongoDB + Redis running for e2e verification (existing `test.yml` provides).