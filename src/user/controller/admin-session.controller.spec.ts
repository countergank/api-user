import { Reflector } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from '../../auth/decorators/permissions.decorator';
import { DomainError } from '../../common/errors/domain.error';
import { ErrorKind } from '../../common/errors/error-kind';
import { ActiveSessionService } from '../../session/active-session.service';
import { ActiveSessionDTO } from '../../session/dto/active-session.dto';
import { ActiveSession } from '../../session/entities/active-session.entity';
import { Permission } from '../../rbac/entities/permission.entity';
import { Role } from '../../rbac/entities/role.entity';
import { Mock } from '../../test-utils';
import { UserService } from '../service/user.service';
import { AdminSessionController } from './admin-session.controller';

describe(AdminSessionController.name, () => {
  let controller: AdminSessionController;
  let userService: UserService;
  let activeSessionService: ActiveSessionService;
  let reflector: Reflector;

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSessionController],
      providers: [UserService, ActiveSessionService],
    })
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (token === getModelToken(Permission.name)) return { find: jest.fn() };
        if (token === getModelToken(Role.name)) return { findOne: jest.fn() };
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<AdminSessionController>(AdminSessionController);
    userService = module.get<UserService>(UserService);
    activeSessionService = module.get<ActiveSessionService>(ActiveSessionService);
    reflector = new Reflector();

    // Mock i18n translate to echo the key (tests verify structure, not language)
    (controller as any).i18n = { translate: jest.fn().mockImplementation((key: string) => Promise.resolve(key)) };
  });

  it(`${AdminSessionController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe('permission metadata', () => {
    it(`declares session:read for ${AdminSessionController.prototype.listSessions.name}`, () => {
      const permissions = reflector.get(PERMISSIONS_KEY, AdminSessionController.prototype.listSessions);
      expect(permissions).toEqual(['session:read']);
    });

    it(`declares session:revoke for ${AdminSessionController.prototype.revokeSession.name}`, () => {
      const permissions = reflector.get(PERMISSIONS_KEY, AdminSessionController.prototype.revokeSession);
      expect(permissions).toEqual(['session:revoke']);
    });

    it(`declares session:revoke for ${AdminSessionController.prototype.logoutAll.name}`, () => {
      const permissions = reflector.get(PERMISSIONS_KEY, AdminSessionController.prototype.logoutAll);
      expect(permissions).toEqual(['session:revoke']);
    });
  });

  describe(`${AdminSessionController.name}.${AdminSessionController.prototype.listSessions.name}`, () => {
    const session = {
      userId: 'user-1',
      sessionId: 'sid-1',
      jti: 'secret-jti',
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0',
      issuedAt: new Date('2026-01-01T10:00:00.000Z'),
      lastAccessAt: new Date('2026-01-02T11:30:00.000Z'),
      expiresAt: new Date('2026-01-08T10:00:00.000Z'),
    } as ActiveSession;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return the mapped sessions of the user', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue({ id: 'user-1' } as any);
      jest.spyOn(activeSessionService, 'listForUser').mockResolvedValue([session]);

      const result = await controller.listSessions('user-1');

      expect(activeSessionService.listForUser).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(ActiveSessionDTO);
      expect(result[0]).toEqual({
        id: 'sid-1',
        device: 'Mozilla/5.0',
        ip: '10.0.0.1',
        issuedAt: '2026-01-01T10:00:00.000Z',
        lastAccessAt: '2026-01-02T11:30:00.000Z',
        expiresAt: '2026-01-08T10:00:00.000Z',
      });
    });

    it('never exposes the refresh token jti (S1)', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue({ id: 'user-1' } as any);
      jest.spyOn(activeSessionService, 'listForUser').mockResolvedValue([session]);

      const result = await controller.listSessions('user-1');

      expect(JSON.stringify(result)).not.toContain('secret-jti');
      expect(Object.keys(result[0] as unknown as Record<string, unknown>)).not.toContain('jti');
    });

    it('propagates USER_NOT_FOUND when the target user does not exist', async () => {
      const error = DomainError.fromKind('USER_NOT_FOUND');
      jest.spyOn(userService, 'findById').mockRejectedValue(error);
      const listSpy = jest.spyOn(activeSessionService, 'listForUser');

      await expect(controller.listSessions('missing')).rejects.toBe(error);
      expect(listSpy).not.toHaveBeenCalled();
    });
  });

  describe(`${AdminSessionController.name}.${AdminSessionController.prototype.revokeSession.name}`, () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should revoke the session and return the i18n message (S2)', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue({ id: 'user-1' } as any);
      jest.spyOn(activeSessionService, 'revokeSession').mockResolvedValue(true);

      const result = await controller.revokeSession('user-1', 'sid-1', undefined);

      expect(activeSessionService.revokeSession).toHaveBeenCalledWith('user-1', 'sid-1');
      expect(result).toEqual({ message: 'messages.session_revoked' });
    });

    it('maps an unknown sessionId to ENTITY_NOT_FOUND 404', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue({ id: 'user-1' } as any);
      jest.spyOn(activeSessionService, 'revokeSession').mockResolvedValue(false);

      const error = await controller.revokeSession('user-1', 'unknown', undefined).catch((e) => e);

      expect(error).toBeInstanceOf(DomainError);
      expect(error.kind).toBe(ErrorKind.ENTITY_NOT_FOUND);
      expect(error.statusCode).toBe(404);
    });

    it('propagates USER_NOT_FOUND without touching any session when the user does not exist', async () => {
      const error = DomainError.fromKind('USER_NOT_FOUND');
      jest.spyOn(userService, 'findById').mockRejectedValue(error);
      const revokeSpy = jest.spyOn(activeSessionService, 'revokeSession');

      await expect(controller.revokeSession('missing', 'sid-1', undefined)).rejects.toBe(error);
      expect(revokeSpy).not.toHaveBeenCalled();
    });
  });

  describe(`${AdminSessionController.name}.${AdminSessionController.prototype.logoutAll.name}`, () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('bumps the session epoch and clears every session record (S3, S6)', async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue({ id: 'user-1' } as any);
      jest.spyOn(userService, 'bumpSessionEpoch').mockResolvedValue(2);
      const clearSpy = jest.spyOn(activeSessionService, 'clearForUser').mockResolvedValue(undefined);

      const result = await controller.logoutAll('user-1', undefined);

      expect(userService.bumpSessionEpoch).toHaveBeenCalledWith('user-1');
      expect(clearSpy).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'messages.sessions_revoked_all' });
    });

    it('propagates USER_NOT_FOUND without revoking anything when the user does not exist', async () => {
      const error = DomainError.fromKind('USER_NOT_FOUND');
      jest.spyOn(userService, 'findById').mockRejectedValue(error);
      const bumpSpy = jest.spyOn(userService, 'bumpSessionEpoch');
      const clearSpy = jest.spyOn(activeSessionService, 'clearForUser');

      await expect(controller.logoutAll('missing', undefined)).rejects.toBe(error);
      expect(bumpSpy).not.toHaveBeenCalled();
      expect(clearSpy).not.toHaveBeenCalled();
    });
  });
});
