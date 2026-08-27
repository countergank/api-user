import { INestApplication } from '@nestjs/common';
import { waitForAuditLogEntry, waitForAuditRow } from './audit-poll';

jest.mock('supertest', () => {
  const chain: any = {
    get: jest.fn(),
    query: jest.fn(),
    set: jest.fn(),
    expect: jest.fn(),
  };
  chain.get.mockReturnValue(chain);
  chain.query.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  const request = jest.fn(() => chain);
  (request as any).__chain = chain;
  return request;
});

describe('audit-poll helpers', () => {
  const fakeApp = { getHttpServer: () => 'fake-server' } as unknown as INestApplication;

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('waitForAuditRow', () => {
    it('resolves with the value as soon as the condition returns truthy', async () => {
      const condition = jest.fn().mockResolvedValue({ id: 'row-1', action: 'auth.register' });

      const promise = waitForAuditRow(fakeApp, condition, { timeoutMs: 500, intervalMs: 100 });

      await jest.advanceTimersByTimeAsync(200);

      await expect(promise).resolves.toEqual({ id: 'row-1', action: 'auth.register' });
      expect(condition).toHaveBeenCalledTimes(1);
    });

    it('keeps polling at the configured interval until the condition holds', async () => {
      const condition = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'row-3' });

      const promise = waitForAuditRow(fakeApp, condition, { timeoutMs: 500, intervalMs: 100 });

      await jest.advanceTimersByTimeAsync(300);

      await expect(promise).resolves.toEqual({ id: 'row-3' });
      expect(condition).toHaveBeenCalledTimes(3);
    });

    it('rejects on timeout with elapsed, attempts and last observed value in diagnostics', async () => {
      const condition = jest.fn().mockResolvedValue(null);

      const promise = waitForAuditRow(fakeApp, condition, {
        timeoutMs: 500,
        intervalMs: 100,
        label: 'custom label',
      });

      const expectation = expect(promise).rejects.toMatchObject({
        message: expect.stringContaining('custom label not satisfied within 500ms'),
        diagnostics: {
          elapsedMs: expect.any(Number),
          attempts: expect.any(Number),
          lastObserved: null,
          timeoutMs: 500,
        },
      });

      await jest.advanceTimersByTimeAsync(600);
      await expectation;
    });

    it('polls roughly every intervalMs (no busy loop) within the bound', async () => {
      const condition = jest.fn().mockResolvedValue(null);

      const promise = waitForAuditRow(fakeApp, condition, { timeoutMs: 500, intervalMs: 100 });
      const expectation = expect(promise).rejects.toThrow();

      await jest.advanceTimersByTimeAsync(600);
      await expectation;

      // 500ms bound / 100ms interval => ~5 attempts, never a tight loop
      expect(condition.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(condition.mock.calls.length).toBeLessThanOrEqual(7);
    });

    it('survives a transient condition error and recovers on the next attempt', async () => {
      const condition = jest
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ id: 'row-after-error' });

      const promise = waitForAuditRow(fakeApp, condition, { timeoutMs: 500, intervalMs: 100 });
      await jest.advanceTimersByTimeAsync(200);

      await expect(promise).resolves.toEqual({ id: 'row-after-error' });
      expect(condition).toHaveBeenCalledTimes(2);
    });

    it('reports the last condition error as lastObserved when it never recovers', async () => {
      const condition = jest.fn().mockRejectedValue(new Error('persistent failure'));

      const promise = waitForAuditRow(fakeApp, condition, { timeoutMs: 500, intervalMs: 100 });
      const expectation = expect(promise).rejects.toMatchObject({
        diagnostics: { lastObserved: { error: 'persistent failure' } },
      });

      await jest.advanceTimersByTimeAsync(600);
      await expectation;
    });
  });

  describe('waitForAuditLogEntry', () => {
    const { __chain: chain } = jest.requireMock('supertest') as any;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('resolves the first matching audit row from /admin/audit-logs', async () => {
      chain.expect.mockResolvedValue({
        body: { data: [{ id: 'row-1', action: 'auth.register' }] },
      });

      const promise = waitForAuditLogEntry(fakeApp, 'admin-token', { action: 'auth.register', resource: 'auth' });
      await jest.advanceTimersByTimeAsync(100);

      await expect(promise).resolves.toEqual({ id: 'row-1', action: 'auth.register' });
      expect(chain.get).toHaveBeenCalledWith('/admin/audit-logs');
      expect(chain.query).toHaveBeenCalledWith({ action: 'auth.register', resource: 'auth' });
      expect(chain.set).toHaveBeenCalledWith('Authorization', 'Bearer admin-token');
    });

    it('keeps polling until an audit row appears', async () => {
      chain.expect
        .mockResolvedValueOnce({ body: { data: [] } })
        .mockResolvedValueOnce({ body: { data: [] } })
        .mockResolvedValueOnce({ body: { data: [{ id: 'row-late' }] } });

      const promise = waitForAuditLogEntry(fakeApp, 'admin-token', { action: 'auth.login', resource: 'auth' });
      await jest.advanceTimersByTimeAsync(300);

      await expect(promise).resolves.toEqual({ id: 'row-late' });
      expect(chain.expect).toHaveBeenCalledTimes(3);
    });
  });
});
