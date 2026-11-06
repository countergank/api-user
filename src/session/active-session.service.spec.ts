import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ActiveSessionRepository } from './repository/active-session.repository';
import { SessionRevocationService } from './session-revocation.service';
import { ActiveSessionService } from './active-session.service';
import { ActiveSession } from './entities/active-session.entity';

describe(ActiveSessionService.name, () => {
  let service: ActiveSessionService;
  let repository: {
    create: jest.Mock;
    findBySessionIdAndUserId: jest.Mock;
    findByJtiAndUserId: jest.Mock;
    listActiveByUserId: jest.Mock;
    rotateSessionToken: jest.Mock;
    deleteBySessionId: jest.Mock;
    deleteAllForUser: jest.Mock;
  };
  let revocation: { revokeJti: jest.Mock };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      findBySessionIdAndUserId: jest.fn(),
      findByJtiAndUserId: jest.fn(),
      listActiveByUserId: jest.fn(),
      rotateSessionToken: jest.fn(),
      deleteBySessionId: jest.fn(),
      deleteAllForUser: jest.fn(),
    };
    revocation = { revokeJti: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ActiveSessionService,
        { provide: ActiveSessionRepository, useValue: repository },
        { provide: SessionRevocationService, useValue: revocation },
      ],
    }).compile();

    service = moduleRef.get(ActiveSessionService);
  });

  it('starts a new session per login with its own id and record', async () => {
    repository.create.mockImplementation(async (data) => ({ ...data }));

    const sessionId = await service.start('user-1', 'jti-a', new Date('2030-01-01'), '10.0.0.1', 'agent A');

    expect(sessionId).toEqual(expect.any(String));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        sessionId,
        jti: 'jti-a',
        ip: '10.0.0.1',
        userAgent: 'agent A',
        expiresAt: new Date('2030-01-01'),
      }),
    );
  });

  it('rotates the token keeping the same session id', async () => {
    const tokenExpiry = new Date('2030-01-01T00:00:00.000Z');
    repository.findByJtiAndUserId.mockResolvedValue({ sessionId: 'session-1', jti: 'jti-old' });

    const sessionId = await service.rotate('user-1', 'jti-old', 'jti-new', tokenExpiry);

    expect(sessionId).toBe('session-1');
    expect(repository.rotateSessionToken).toHaveBeenCalledWith('session-1', 'jti-new', expect.any(Date), tokenExpiry);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('moves the record expiry with every rotation, in sync with the freshly minted refresh token (F2)', async () => {
    const rotatedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    repository.findBySessionIdAndUserId.mockResolvedValue({
      sessionId: 'session-1',
      jti: 'jti-live',
      expiresAt: new Date('2026-01-08T00:00:00.000Z'),
    });

    await service.rotateBySessionId('user-1', 'session-1', 'jti-new', rotatedExpiry);

    expect(repository.rotateSessionToken).toHaveBeenCalledWith('session-1', 'jti-new', expect.any(Date), rotatedExpiry);
  });

  it('starts a fresh session when the rotated jti has no record (pre-fixture sessions)', async () => {
    repository.findBySessionIdAndUserId.mockResolvedValue(null);
    repository.create.mockImplementation(async (data) => ({ ...data }));
    const tokenExpiry = new Date('2030-01-01T00:00:00.000Z');

    await service.rotate('user-1', 'jti-orphan', 'jti-new', tokenExpiry);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', jti: 'jti-new', expiresAt: tokenExpiry }),
    );
    expect(repository.rotateSessionToken).not.toHaveBeenCalled();
  });

  it('revokes a session by id through the refresh denylist and removes the record', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    repository.findBySessionIdAndUserId.mockResolvedValue({ sessionId: 'session-1', jti: 'jti-live', expiresAt });

    const revoked = await service.revokeSession('user-1', 'session-1');

    expect(revoked).toBe(true);
    expect(revocation.revokeJti).toHaveBeenCalledWith('jti-live', expiresAt.getTime() / 1000);
    expect(repository.deleteBySessionId).toHaveBeenCalledWith('session-1', 'user-1');
  });

  it('returns false when the session id does not belong to the user or no longer exists', async () => {
    repository.findBySessionIdAndUserId.mockResolvedValue(null);

    const revoked = await service.revokeSession('user-1', 'session-unknown');

    expect(revoked).toBe(false);
    expect(revocation.revokeJti).not.toHaveBeenCalled();
    expect(repository.deleteBySessionId).not.toHaveBeenCalled();
  });

  it('ends the session bound to a refresh jti (self logout)', async () => {
    repository.findByJtiAndUserId.mockResolvedValue({ sessionId: 'session-1' });

    await service.endByJti('user-1', 'jti-live');

    expect(repository.deleteBySessionId).toHaveBeenCalledWith('session-1', 'user-1');
  });

  it('keeps going when ending a session hits no record', async () => {
    repository.findByJtiAndUserId.mockResolvedValue(null);

    await expect(service.endByJti('user-1', 'jti-unknown')).resolves.not.toThrow();
    expect(repository.deleteBySessionId).not.toHaveBeenCalled();
  });

  it('clears every record for a user on revoke-all', async () => {
    await service.clearForUser('user-1');

    expect(repository.deleteAllForUser).toHaveBeenCalledWith('user-1');
  });

  it('rotates a session by its stable id: denies the current jti and moves the record to the new one (S7)', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    repository.findBySessionIdAndUserId.mockResolvedValue({ sessionId: 'session-1', jti: 'jti-live', expiresAt });

    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sessionId = await service.rotateBySessionId('user-1', 'session-1', 'jti-new', tokenExpiry);

    expect(sessionId).toBe('session-1');
    expect(revocation.revokeJti).toHaveBeenCalledWith('jti-live', expiresAt.getTime() / 1000);
    expect(repository.rotateSessionToken).toHaveBeenCalledWith('session-1', 'jti-new', expect.any(Date), tokenExpiry);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns null for a session id with no live record, without denying anything (S7)', async () => {
    repository.findBySessionIdAndUserId.mockResolvedValue(null);

    expect(await service.rotateBySessionId('user-1', 'session-unknown', 'jti-new', new Date())).toBeNull();

    expect(revocation.revokeJti).not.toHaveBeenCalled();
    expect(repository.rotateSessionToken).not.toHaveBeenCalled();
  });

  it('lists only the active records of the requested user', async () => {
    const records = [{ sessionId: 'session-1' }] as ActiveSession[];
    repository.listActiveByUserId.mockResolvedValue(records);

    expect(await service.listForUser('user-1')).toEqual(records);
    expect(repository.listActiveByUserId).toHaveBeenCalledWith('user-1');
  });
});
