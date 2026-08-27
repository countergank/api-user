import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface PollOptions {
  timeoutMs?: number; // default 5000
  intervalMs?: number; // default 100
  label?: string; // human-readable label for diagnostics
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
 * @param _app kept for interface symmetry with waitForAuditLogEntry.
 */
export async function waitForAuditRow<T>(
  _app: INestApplication,
  condition: () => Promise<T>,
  options: PollOptions = {},
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
    await new Promise((r) => setTimeout(r, intervalMs));
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
  options: PollOptions = {},
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
    { ...options, label: `audit log (action=${filter.action}, resource=${filter.resource})` },
  );
}
