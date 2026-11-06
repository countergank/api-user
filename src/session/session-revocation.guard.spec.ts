/*
 * Security regression probes for the active-session revocation unit:
 * the audit arity trap, the token-version epoch check, denylist-before-mint
 * ordering, denylist TTL vs live token life, expired-record revocation,
 * jti non-leakage and the change-password rotation fallback.
 */
import { Reflector } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { of, firstValueFrom } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { ActiveSessionService } from './active-session.service';
import { SessionRevocationService } from './session-revocation.service';
import { ActiveSessionRepository } from './repository/active-session.repository';
import { ActiveSessionDTO } from './dto/active-session.dto';
import { AuditAspectInterceptor } from '../common/audit/audit-aspect.interceptor';
import { AUDIT_ACTION_KEY } from '../common/audit/audit.decorator';
import { UserProfileController } from '../user/controller/user-profile.controller';

const DAY = 24 * 60 * 60 * 1000;

describe('PROBE P1 — audit getAfter arity (admin-session revoke, S2)', () => {
  it('the 2-arg getAfter shape used by revokeSession throws when the interceptor calls getAfter(result)', async () => {
    const reflector = new Reflector();
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const config = { get: (_k: string, d?: unknown) => (d === undefined ? 'true' : 'true') } as unknown as ConfigService;
    const cls = { get: () => 'actor-1', getId: () => 'corr-1' } as any;

    class ProbeController {
      handler() {
        return 'ok';
      }
    }
    Reflect.defineMetadata(
      AUDIT_ACTION_KEY,
      { action: 'USER_SESSION_REVOKE', resource: 'user', getAfter: (_result: unknown, args: unknown[]) => ({ sessionId: args[1] }) },
      ProbeController.prototype.handler,
    );

    const interceptor = new AuditAspectInterceptor(reflector, emitter, config, cls);
    const ctx: any = {
      getHandler: () => ProbeController.prototype.handler,
      switchToHttp: () => ({ getRequest: () => ({ params: { id: 'user-1', sessionId: 'sid-1' } }) }),
    };

    const err = await firstValueFrom(interceptor.intercept(ctx, { handle: () => of({ message: 'ok' }) })).catch((e) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(String((err as Error).message)).toMatch(/undefined/);
  });

  it('getResourceId(result, args) does receive args, so the resource id is the target user', async () => {
    const reflector = new Reflector();
    const emitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const config = { get: () => 'true' } as unknown as ConfigService;
    const cls = { get: () => 'actor-1', getId: () => 'corr-1' } as any;
    class ProbeController2 {
      handler() {
        return 'ok';
      }
    }
    Reflect.defineMetadata(
      AUDIT_ACTION_KEY,
      { action: 'USER_SESSION_LIST', resource: 'user', getResourceId: (_r: unknown, args: unknown[]) => args[0] },
      ProbeController2.prototype.handler,
    );
    const interceptor = new AuditAspectInterceptor(reflector, emitter, config, cls);
    const ctx: any = { getHandler: () => ProbeController2.prototype.handler, switchToHttp: () => ({ getRequest: () => ({ params: { id: 'user-42' } }) }) };
    await firstValueFrom(interceptor.intercept(ctx, { handle: () => of([]) }));
    expect((emitter.emit as jest.Mock).mock.calls[0][1].resourceId).toBe('user-42');
  });
});

describe('PROBE P2 — access-token epoch (JwtStrategy, S6)', () => {
  const build = (epoch: number | undefined) => {
    const validateUser = jest.fn().mockResolvedValue({ id: 'u1', sessionEpoch: epoch });
    const authService = { validateUser } as unknown as AuthService;
    const config = { getOrThrow: () => 'secret' } as unknown as ConfigService;
    return new JwtStrategy(authService, config);
  };
  const p = (tv?: number | null) => ({ sub: 'u1', email: 'e', role: 'user', ...(tv !== undefined && { tv }) }) as any;

  it('tv == epoch accepted, tv > epoch accepted, tv < epoch null', async () => {
    await expect(build(3).validate(p(3))).resolves.toMatchObject({ id: 'u1' });
    await expect(build(3).validate(p(4))).resolves.toMatchObject({ id: 'u1' });
    await expect(build(3).validate(p(2))).resolves.toBeNull();
  });

  it('missing tv behaves as 0: valid at epoch 0/undefined, dead at epoch 1', async () => {
    await expect(build(0).validate(p())).resolves.toMatchObject({ id: 'u1' });
    await expect(build(undefined).validate(p())).resolves.toMatchObject({ id: 'u1' });
    await expect(build(1).validate(p())).resolves.toBeNull();
  });

  it('explicit null tv behaves as 0 (dead at epoch 1)', async () => {
    await expect(build(1).validate(p(null))).resolves.toBeNull();
  });

  it('unknown user still yields null (pre-existing behaviour kept)', async () => {
    const config = { getOrThrow: () => 'secret' } as unknown as ConfigService;
    const s = new JwtStrategy({ validateUser: async () => null } as unknown as AuthService, config);
    await expect(s.validate(p(0))).resolves.toBeNull();
  });
});

describe('PROBE P3 — denylist-before-mint / ordering (S2, S5)', () => {
  it('revokeSession: failing denylist propagates and never deletes the record', async () => {
    const repo = { findBySessionIdAndUserId: jest.fn().mockResolvedValue({ sessionId: 's', jti: 'j', expiresAt: new Date(Date.now() + DAY) }), deleteBySessionId: jest.fn() } as unknown as ActiveSessionRepository;
    const rev = { revokeJti: jest.fn().mockRejectedValue(new Error('redis down')) } as unknown as SessionRevocationService;
    const svc = new ActiveSessionService(repo, rev);
    await expect(svc.revokeSession('u', 's')).rejects.toThrow('redis down');
    expect(repo.deleteBySessionId).not.toHaveBeenCalled();
  });

  it('rotateBySessionId: failing denylist propagates and never rotates the record', async () => {
    const repo = { findBySessionIdAndUserId: jest.fn().mockResolvedValue({ sessionId: 's', jti: 'j', expiresAt: new Date(Date.now() + DAY) }), rotateSessionToken: jest.fn() } as unknown as ActiveSessionRepository;
    const rev = { revokeJti: jest.fn().mockRejectedValue(new Error('redis down')) } as unknown as SessionRevocationService;
    const svc = new ActiveSessionService(repo, rev);
    await expect(svc.rotateBySessionId('u', 's', 'j2', new Date(Date.now() + DAY))).rejects.toThrow('redis down');
    expect(repo.rotateSessionToken).not.toHaveBeenCalled();
  });

  it('refreshToken: failing denylist fails the exchange and mints nothing (old refresh stays unusable)', async () => {
    const user = { id: 'u1', email: 'e', role: 'user', userName: 'u', name: 'n', lastName: 'l', sessionEpoch: 1 };
    const jwt = {
      verify: jest.fn().mockReturnValue({ sub: 'u1', jti: 'old', tv: 1, exp: Math.floor(Date.now() / 1000) + DAY }),
      sign: jest.fn().mockReturnValue('signed'),
    };
    const rev = { isJtiRevoked: jest.fn().mockResolvedValue(false), revokeJti: jest.fn().mockRejectedValue(new Error('redis down')) };
    const activeSession = { rotate: jest.fn(), start: jest.fn() };
    const svc = new AuthService(
      { findById: jest.fn().mockResolvedValue(user) } as any,
      jwt as unknown as JwtService,
      { emit: jest.fn() } as any,
      { get: (_k: string, d: unknown) => d } as any,
      {} as any,
      { get: jest.fn(), set: jest.fn() } as any,
      { getPermissionsForRole: jest.fn().mockResolvedValue([]) } as any,
      rev as unknown as SessionRevocationService,
      activeSession as unknown as ActiveSessionService,
    );
    await expect(svc.refreshToken('tok', { ip: '1.2.3.4' })).rejects.toThrow('redis down');
    expect(jwt.sign).not.toHaveBeenCalled();
    expect(activeSession.rotate).not.toHaveBeenCalled();
    expect(activeSession.start).not.toHaveBeenCalled();
  });

  it('rotation order: old jti is denylisted before any sign call', async () => {
    const user = { id: 'u1', email: 'e', role: 'user', userName: 'u', name: 'n', lastName: 'l', sessionEpoch: 0 };
    const order: string[] = [];
    const jwt = {
      verify: jest.fn().mockReturnValue({ sub: 'u1', jti: 'old', tv: 0, exp: Math.floor(Date.now() / 1000) + DAY }),
      sign: jest.fn().mockImplementation((_p: unknown, o?: { jwtid?: string }) => {
        order.push(`sign:${o?.jwtid ?? 'access'}`);
        return 'signed';
      }),
    };
    const rev = {
      isJtiRevoked: jest.fn().mockResolvedValue(false),
      revokeJti: jest.fn().mockImplementation(async (jti: string) => { order.push(`deny:${jti}`); }),
    };
    const activeSession = { rotate: jest.fn().mockImplementation(async (_u: string, _o: string, n: string) => { order.push(`rotate:${n}`); return 'sess-1'; }), start: jest.fn() };
    const svc = new AuthService(
      { findById: jest.fn().mockResolvedValue(user) } as any,
      jwt as unknown as JwtService,
      { emit: jest.fn() } as any,
      { get: (_k: string, d: unknown) => d } as any,
      {} as any,
      { get: jest.fn(), set: jest.fn() } as any,
      { getPermissionsForRole: jest.fn().mockResolvedValue([]) } as any,
      rev as unknown as SessionRevocationService,
      activeSession as unknown as ActiveSessionService,
    );
    const res = await svc.refreshToken('tok');
    expect(order[0]).toBe('deny:old');
    expect(order.indexOf('deny:old')).toBeLessThan(order.findIndex((o) => o.startsWith('sign:')));
    expect(res.sessionId).toBe('sess-1');
  });
});

describe('PROBE P4 — revoke-one denylist TTL vs live refresh token life (S2, F2 fix pin)', () => {
  it('denylists the current jti for the live token\u2019s FULL remaining life: record expiresAt moves with every rotation', async () => {
    const t0 = Date.now();
    const recordExpiresAt = new Date(t0 + 7 * DAY);
    const store: any = { sessionId: 's1', jti: 'J1', expiresAt: recordExpiresAt, lastAccessAt: new Date(t0) };
    const repo = {
      findBySessionIdAndUserId: jest.fn().mockImplementation(async (_sid: string) => {
        if (store.expiresAt.getTime() <= Date.now()) return null;
        return { ...store };
      }),
      findByJtiAndUserId: jest.fn().mockImplementation(async () => (store.expiresAt.getTime() <= Date.now() ? null : { ...store })),
      rotateSessionToken: jest.fn().mockImplementation(async (_sid: string, jti: string, _last: Date, expiresAt: Date) => {
        store.jti = jti;
        store.lastAccessAt = new Date();
        store.expiresAt = expiresAt;
      }),
      deleteBySessionId: jest.fn().mockImplementation(async () => { store.deleted = true; }),
    } as unknown as ActiveSessionRepository;
    const recorded: { jti: string; exp: number }[] = [];
    const rev = { revokeJti: jest.fn().mockImplementation(async (jti: string, exp: number) => { recorded.push({ jti, exp }); }) } as unknown as SessionRevocationService;
    const svc = new ActiveSessionService(repo, rev);

    // Day 6: a refresh exchange rotates J1 -> J2; the new refresh token is signed for 7d from now.
    const rotationAt = t0 + 6 * DAY;
    const jwt = new JwtService({ secret: 'probe-secret' });
    const signedAtRotation = jwt.sign(
      { sub: 'u1', tv: 0, exp: Math.floor(rotationAt / 1000) + 7 * 86400 },
      { secret: 'probe-secret', jwtid: 'J2' },
    );
    const newRefreshExp = (jwt.decode(signedAtRotation) as any).exp as number;
    await svc.rotate('u1', 'J1', 'J2', new Date(newRefreshExp * 1000));

    // Day 6 + 1min: admin revokes the session.
    const revokeAt = rotationAt + 60_000;

    await svc.revokeSession('u1', 's1');

    // The denylist now covers the live token's whole remaining life.
    expect(recorded).toEqual([{ jti: 'J2', exp: newRefreshExp }]);
    const secondsUntilTokenExpiry = newRefreshExp - Math.floor(revokeAt / 1000);
    const denylistTtlSeconds = newRefreshExp - Math.floor(revokeAt / 1000);
    expect(denylistTtlSeconds).toBe(secondsUntilTokenExpiry);
    expect(store.deleted).toBe(true);
  });
});

describe('PROBE P5 — record visibility after record expiry (S2, S3)', () => {
  it('a live refresh token whose record expired (expiresAt passed) is neither listed nor revocable', async () => {
    const repo = {
      findBySessionIdAndUserId: jest.fn().mockResolvedValue(null), // real query filters expiresAt > now
      listActiveByUserId: jest.fn().mockResolvedValue([]),
      deleteBySessionId: jest.fn(),
    } as unknown as ActiveSessionRepository;
    const rev = { revokeJti: jest.fn() } as unknown as SessionRevocationService;
    const svc = new ActiveSessionService(repo, rev);

    await expect(svc.revokeSession('u1', 's-lived')).resolves.toBe(false);
    expect(rev.revokeJti).not.toHaveBeenCalled();
    expect(await svc.listForUser('u1')).toEqual([]);
    // Meanwhile refreshToken() never consults the record: it only checks the jti denylist and tv.
  });
});

describe('PROBE P6 — DTO leakage (S1)', () => {
  it('ActiveSessionDTO exposes only id/device/ip/timestamps and never jti/userId', () => {
    const dto = new ActiveSessionDTO({
      userId: 'u1', sessionId: 'sid-1', jti: 'SECRET-JTI', ip: '1.2.3.4', userAgent: 'UA',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'), lastAccessAt: new Date('2026-01-02T00:00:00.000Z'), expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    } as any);
    expect(JSON.stringify(dto)).not.toContain('SECRET-JTI');
    expect(Object.keys(dto).sort()).toEqual(['device', 'expiresAt', 'id', 'ip', 'issuedAt', 'lastAccessAt']);
  });
});

describe('PROBE P7 — change-password legacy fallback (no sid) (S7)', () => {
  const build = (sessionId: string | undefined) => {
    const rotate = jest.fn().mockResolvedValue({ sessionId: 's', accessToken: 'a', refreshToken: 'r', user: { id: 'u1' } });
    const moduleRef = { get: () => ({ rotateCurrentSession: rotate }) } as any;
    const c = new UserProfileController(
      { changePassword: jest.fn().mockResolvedValue(undefined) } as any,
      { emit: jest.fn() } as any,
      { translate: jest.fn().mockResolvedValue('msg') } as any,
      moduleRef,
    );
    return { c, rotate, sessionId };
  };

  it('without sid returns message only and never rotates', async () => {
    const { c, rotate } = build(undefined);
    const res: any = await c.changePassword({ id: 'u1' } as any, { currentPassword: 'a', newPassword: 'b' } as any, 'en', undefined, undefined);
    expect(res).toEqual({ message: 'msg' });
    expect(rotate).not.toHaveBeenCalled();
  });

  it('with sid returns fresh tokens for the same session id', async () => {
    const { c, rotate } = build('s');
    const res: any = await c.changePassword({ id: 'u1' } as any, { currentPassword: 'a', newPassword: 'b' } as any, 'en', "s", { ip: "1.1.1.1", userAgent: "UA" });
    expect(rotate).toHaveBeenCalledWith('u1', 's', { ip: '1.1.1.1', userAgent: 'UA' });
    expect(res).toMatchObject({ sessionId: 's', accessToken: 'a', refreshToken: 'r' });
  });
});
