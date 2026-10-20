import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DomainError } from '../common/errors/domain.error';
import { User, UserRole } from '../user/entities/user.entity';
import { UserService } from '../user/service/user.service';
import { Permission } from '../rbac/entities/permission.entity';
import { Role } from '../rbac/entities/role.entity';
import { RoleService } from '../rbac/services/role.service';
import { AuthService } from './auth.service';
import { EmailEvents } from '../email/constants/email.events';
import { EMAIL_REVERT_WINDOW_MS } from '../user/service/email-change-code';
import { UserMock } from '../user/mocks/user.mock';
import { Mock } from '../test-utils';
import { CacheService } from '../config/cache';
import { SessionRevocationService } from '../session/session-revocation.service';

/**
 * Assert that a promise rejects with a DomainError carrying the expected
 * ErrorKind. Fails when the promise resolves or when the rejected value is
 * not a DomainError with the exact kind.
 */
async function expectDomainError(promise: Promise<unknown>, kind: string): Promise<void> {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(DomainError);
  expect((thrown as DomainError).kind.kind).toBe(kind);
}

/**
 * Transaction harness for S17: a write is only visible once the enclosing
 * transaction resolves, and a rejection discards everything staged inside it.
 */
class TransactionHarness {
  /** What a reader sees after the last committed transaction. */
  readonly committed: Record<string, Record<string, unknown>> = {};
  commits = 0;
  aborts = 0;

  private staged: Array<() => void> = [];

  readonly connection = {
    startSession: jest.fn(async () => {
      this.staged = [];
      const session = {
        withTransaction: jest.fn(async (callback: (session: unknown) => Promise<unknown>) => {
          try {
            const result = await callback(session);
            for (const apply of this.staged) apply();
            this.staged = [];
            this.commits += 1;
            return result;
          } catch (error) {
            this.aborts += 1;
            throw error;
          }
        }),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      return session;
    }),
  };

  /** Stages a write when a transaction session exists, commits it otherwise. */
  stage(session: unknown, apply: () => void): void {
    if (session) {
      this.staged.push(apply);
      return;
    }
    apply();
  }

  write(id: string, data: Record<string, unknown>): void {
    this.committed[id] = { ...(this.committed[id] ?? {}), ...data };
  }

  read(id: string, field: string): unknown {
    return this.committed[id]?.[field];
  }
}

describe(AuthService.name, () => {
  let service: AuthService;
  let userService: UserService;
  let roleService: RoleService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let eventEmitter: EventEmitter2;
  let harness: TransactionHarness;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockSessionRevocation = {
    revokeJti: jest.fn().mockResolvedValue(undefined),
    isJtiRevoked: jest.fn().mockResolvedValue(false),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSessionRevocation.revokeJti.mockResolvedValue(undefined);
    mockSessionRevocation.isJtiRevoked.mockResolvedValue(false);
    harness = new TransactionHarness();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UserService, RoleService, JwtService, EventEmitter2, ConfigService],
    })
      .useMocker((token) => {
        if (token === getConnectionToken()) return harness.connection;
        if (token === getModelToken(Role.name)) return {};
        if (token === getModelToken(Permission.name)) return { find: jest.fn() };
        if (token === CacheService) return mockCacheService;
        if (token === SessionRevocationService) return mockSessionRevocation;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    roleService = module.get<RoleService>(RoleService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe(`${AuthService.name}.${AuthService.prototype.register.name}`, () => {
    it('should throw DomainError EMAIL_OR_USERNAME_EXISTS for duplicate email/username', async () => {
      jest.spyOn(userService, 'existsByEmailOrUsername').mockResolvedValue(true);

      await expectDomainError(
        service.register('dup@test.com', 'dup-user', 'password123', 'Dup', 'User'),
        'EMAIL_OR_USERNAME_EXISTS',
      );
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.login.name}`, () => {
    it('should throw DomainError INVALID_CREDENTIALS for non-existent user', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expectDomainError(service.login('nonexistent@test.com', 'password123'), 'INVALID_CREDENTIALS');
    });

    it('should throw DomainError ACCOUNT_LOCKED when account is locked', async () => {
      const lockedUser = new UserMock();
      lockedUser.failedLoginAttempts = 5;
      lockedUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(lockedUser);
      jest.spyOn(configService, 'get').mockReturnValue(5); // MAX_LOGIN_ATTEMPTS

      await expectDomainError(service.login(lockedUser.email, 'any'), 'ACCOUNT_LOCKED');
    });

    it('should allow login when lockout has expired and reset counter', async () => {
      const expiredLockUser = new UserMock();
      expiredLockUser.failedLoginAttempts = 5;
      expiredLockUser.lockedUntil = new Date(Date.now() - 60 * 1000); // expired 1 minute ago
      expiredLockUser.isActive = true;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(expiredLockUser);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(userService, 'update').mockResolvedValue(expiredLockUser);
      jest.spyOn(jwtService, 'sign').mockReturnValue('fake-token');

      const result = await service.login(expiredLockUser.email, 'correct-password');

      expect(userService.update).toHaveBeenCalledWith(expiredLockUser.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should increment failedLoginAttempts and throw DomainError INVALID_CREDENTIALS on wrong password', async () => {
      const user = new UserMock();
      user.failedLoginAttempts = 2;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(false);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      jest.spyOn(configService, 'get').mockReturnValue(10); // MAX_LOGIN_ATTEMPTS high enough to not trigger lock

      await expectDomainError(service.login(user.email, 'wrong-password'), 'INVALID_CREDENTIALS');

      expect(userService.update).toHaveBeenCalledWith(user.id, {
        failedLoginAttempts: 3,
      });
    });

    it('should lock account when failed attempts reach MAX_LOGIN_ATTEMPTS and throw INVALID_CREDENTIALS', async () => {
      const user = new UserMock();
      user.failedLoginAttempts = 4;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(false);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      jest.spyOn(configService, 'get').mockReturnValueOnce(5); // MAX_LOGIN_ATTEMPTS
      jest.spyOn(configService, 'get').mockReturnValueOnce(15); // LOCKOUT_DURATION_MINUTES

      await expectDomainError(service.login(user.email, 'wrong-password'), 'INVALID_CREDENTIALS');

      const updateCall = (userService.update as jest.Mock).mock.calls[0];
      expect(updateCall[1].failedLoginAttempts).toBe(5);
      expect(updateCall[1].lockedUntil).toBeInstanceOf(Date);
      expect(updateCall[1].lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset failedLoginAttempts on successful login', async () => {
      const user = new UserMock();
      user.failedLoginAttempts = 2;
      user.isActive = true;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('fake-token');

      const result = await service.login(user.email, 'correct-password');

      expect(userService.update).toHaveBeenCalledWith(user.id, {
        failedLoginAttempts: 0,
        lockedUntil: null,
      });
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw DomainError ACCOUNT_INACTIVE for inactive account', async () => {
      const inactiveUser = new UserMock();
      inactiveUser.isActive = false;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(inactiveUser);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);

      await expectDomainError(service.login(inactiveUser.email, 'correct-password'), 'ACCOUNT_INACTIVE');
    });

    it('should check lockout BEFORE password validation (security)', async () => {
      const lockedUser = new UserMock();
      lockedUser.failedLoginAttempts = 5;
      lockedUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(lockedUser);
      const validatePasswordSpy = jest.spyOn(userService, 'validatePassword');
      jest.spyOn(configService, 'get').mockReturnValue(5);

      await expectDomainError(service.login(lockedUser.email, 'any-password'), 'ACCOUNT_LOCKED');

      // Password validation should NOT be called for locked accounts
      expect(validatePasswordSpy).not.toHaveBeenCalled();
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.resetPassword.name}`, () => {
    const validResetUser = () => {
      const user = new UserMock();
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      return user;
    };

    /** Writes through the harness so the test observes what actually commits. */
    const stageUserUpdate = (user: UserMock) =>
      jest.spyOn(userService, 'update').mockImplementation(async (id, data, session) => {
        harness.stage(session, () => harness.write(id, data as Record<string, unknown>));
        return user;
      });

    const stageEpochBump = () =>
      jest.spyOn(userService, 'bumpSessionEpoch').mockImplementation(async (id, session) => {
        harness.stage(session, () => harness.write(id, { sessionEpoch: 1 }));
        return 1;
      });

    it('should throw DomainError EXPIRED_RESET_TOKEN when user is not found by token', async () => {
      jest.spyOn(userService, 'findByResetToken').mockResolvedValue(null);

      await expectDomainError(service.resetPassword('invalid-token', 'new-password'), 'EXPIRED_RESET_TOKEN');
    });

    it('should throw DomainError EXPIRED_RESET_TOKEN when reset token has expired', async () => {
      const user = new UserMock();
      user.resetPasswordExpires = new Date(Date.now() - 60 * 1000); // expired 1 minute ago

      jest.spyOn(userService, 'findByResetToken').mockResolvedValue(user);

      await expectDomainError(service.resetPassword('expired-token', 'new-password'), 'EXPIRED_RESET_TOKEN');
    });

    it('revokes every session by bumping the durable epoch inside the reset transaction (S14, S17)', async () => {
      const user = validResetUser();
      jest.spyOn(userService, 'findByResetToken').mockResolvedValue(user);
      jest.spyOn(userService, 'hashPassword').mockResolvedValue('hashed');
      const updateSpy = stageUserUpdate(user);
      const bumpSpy = stageEpochBump();

      await service.resetPassword('valid-token', 'new-password');

      const transactionSession = updateSpy.mock.calls[0][2];
      expect(transactionSession).toBeDefined();
      expect(bumpSpy).toHaveBeenCalledWith(user.id, transactionSession);
      expect(harness.read(user.id, 'password')).toBe('hashed');
      expect(harness.read(user.id, 'sessionEpoch')).toBe(1);
    });

    it('does not persist the reset when the epoch bump fails (S17)', async () => {
      const user = validResetUser();
      jest.spyOn(userService, 'findByResetToken').mockResolvedValue(user);
      jest.spyOn(userService, 'hashPassword').mockResolvedValue('hashed');
      stageUserUpdate(user);
      jest.spyOn(userService, 'bumpSessionEpoch').mockRejectedValue(new Error('mongo down'));

      await expect(service.resetPassword('valid-token', 'new-password')).rejects.toThrow('mongo down');

      // The transaction aborted before commit: the new password never landed.
      expect(harness.committed[user.id]).toBeUndefined();
      expect(harness.aborts).toBe(1);
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.verifyEmail.name}`, () => {
    it('should throw DomainError EXPIRED_VERIFICATION_TOKEN when user is not found by token', async () => {
      jest.spyOn(userService, 'findByEmailVerificationToken').mockResolvedValue(null);

      await expectDomainError(service.verifyEmail('invalid-token'), 'EXPIRED_VERIFICATION_TOKEN');
    });

    it('should throw DomainError EXPIRED_VERIFICATION_TOKEN when verification token has expired', async () => {
      const user = new UserMock();
      user.emailVerificationExpires = new Date(Date.now() - 60 * 1000); // expired 1 minute ago

      jest.spyOn(userService, 'findByEmailVerificationToken').mockResolvedValue(user);

      await expectDomainError(service.verifyEmail('expired-token'), 'EXPIRED_VERIFICATION_TOKEN');
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.confirmEmailChange.name}`, () => {
    /** A user with a live confirmation token for a pending email change. */
    const pendingChangeUser = (): UserMock => {
      const user = new UserMock();
      (user as unknown as Record<string, unknown>).id = 'user-1';
      user.email = 'old@test.com';
      user.pendingEmail = 'new@test.com';
      user.pendingEmailExpires = new Date(Date.now() + 60 * 60 * 1000);
      return user;
    };

    /** Writes through the harness so the test observes what actually commits. */
    const stageUserUpdate = (user: UserMock) =>
      jest.spyOn(userService, 'update').mockImplementation(async (id, data, session) => {
        harness.stage(session, () => harness.write(id, data as Record<string, unknown>));
        return user;
      });

    const stageEpochBump = () =>
      jest.spyOn(userService, 'bumpSessionEpoch').mockImplementation(async (id, session) => {
        harness.stage(session, () => harness.write(id, { sessionEpoch: 1 }));
        return 1;
      });

    it('should throw DomainError EXPIRED_CONFIRMATION_TOKEN when user is not found by token', async () => {
      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(null);

      await expectDomainError(service.confirmEmailChange('invalid-token'), 'EXPIRED_CONFIRMATION_TOKEN');
    });

    it('should throw DomainError EXPIRED_CONFIRMATION_TOKEN when confirmation token has expired', async () => {
      const user = new UserMock();
      user.pendingEmail = 'new@test.com';
      user.pendingEmailExpires = new Date(Date.now() - 60 * 1000); // expired 1 minute ago

      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(user);

      await expectDomainError(service.confirmEmailChange('expired-token'), 'EXPIRED_CONFIRMATION_TOKEN');
    });

    it('should throw DomainError NO_PENDING_EMAIL_CHANGE when no pending email change exists', async () => {
      const user = new UserMock();
      user.pendingEmail = null as unknown as string;
      user.pendingEmailExpires = new Date(Date.now() + 60 * 60 * 1000); // valid in the future

      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(user);

      await expectDomainError(service.confirmEmailChange('valid-token'), 'NO_PENDING_EMAIL_CHANGE');
    });

    it('should revoke every session by bumping the durable epoch inside the email-change transaction (S4, S17)', async () => {
      const user = new UserMock();
      user.pendingEmail = 'new@test.com';
      user.pendingEmailExpires = new Date(Date.now() + 60 * 60 * 1000);

      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(user);
      const updateSpy = jest.spyOn(userService, 'update').mockImplementation(async (id, data, session) => {
        harness.stage(session, () => harness.write(id, data as Record<string, unknown>));
        return user;
      });
      jest.spyOn(userService, 'unsetFields').mockResolvedValue(user);
      const bumpSpy = jest.spyOn(userService, 'bumpSessionEpoch').mockImplementation(async (id, session) => {
        harness.stage(session, () => harness.write(id, { sessionEpoch: 1 }));
        return 1;
      });

      await service.confirmEmailChange('valid-token');

      const transactionSession = updateSpy.mock.calls[0][2];
      expect(transactionSession).toBeDefined();
      expect(bumpSpy).toHaveBeenCalledWith(user.id, transactionSession);
      expect(harness.read(user.id, 'email')).toBe('new@test.com');
      expect(harness.read(user.id, 'sessionEpoch')).toBe(1);
    });

    it('does not persist the email change when the epoch bump fails (S17)', async () => {
      const user = new UserMock();
      user.pendingEmail = 'new@test.com';
      user.pendingEmailExpires = new Date(Date.now() + 60 * 60 * 1000);

      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(user);
      jest.spyOn(userService, 'update').mockImplementation(async (id, data, session) => {
        harness.stage(session, () => harness.write(id, data as Record<string, unknown>));
        return user;
      });
      jest.spyOn(userService, 'unsetFields').mockResolvedValue(user);
      jest.spyOn(userService, 'bumpSessionEpoch').mockRejectedValue(new Error('mongo down'));

      await expect(service.confirmEmailChange('valid-token')).rejects.toThrow('mongo down');

      expect(harness.committed[user.id]).toBeUndefined();
      expect(harness.aborts).toBe(1);
    });

    it('should not bump the epoch when the email change cannot be confirmed', async () => {
      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(null);
      const bumpSpy = jest.spyOn(userService, 'bumpSessionEpoch');

      await expectDomainError(service.confirmEmailChange('invalid-token'), 'EXPIRED_CONFIRMATION_TOKEN');
      expect(bumpSpy).not.toHaveBeenCalled();
    });

    it('stores the previous email and a 72 h revert token in the same transaction as the new email (S5, S13)', async () => {
      const user = pendingChangeUser();
      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(user);
      const updateSpy = stageUserUpdate(user);
      jest.spyOn(userService, 'unsetFields').mockResolvedValue(user);
      const bumpSpy = stageEpochBump();

      await service.confirmEmailChange('valid-token');

      const transactionSession = updateSpy.mock.calls[0][2];
      expect(harness.read(user.id, 'email')).toBe('new@test.com');
      expect(harness.read(user.id, 'previousEmail')).toBe('old@test.com');
      expect(typeof harness.read(user.id, 'emailRevertToken')).toBe('string');
      expect(harness.read(user.id, 'emailRevertToken')).not.toHaveLength(0);

      const expires = harness.read(user.id, 'emailRevertExpires') as Date;
      expect(expires).toBeInstanceOf(Date);
      expect(expires.getTime()).toBeGreaterThan(Date.now() + EMAIL_REVERT_WINDOW_MS - 5_000);
      expect(expires.getTime()).toBeLessThanOrEqual(Date.now() + EMAIL_REVERT_WINDOW_MS);
      expect(bumpSpy).toHaveBeenCalledWith(user.id, transactionSession);
    });

    it('notifies both the new and the previous address (S4, S12)', async () => {
      const user = pendingChangeUser();
      jest.spyOn(userService, 'findByPendingEmailToken').mockResolvedValue(user);
      stageUserUpdate(user);
      jest.spyOn(userService, 'unsetFields').mockResolvedValue(user);
      stageEpochBump();
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await service.confirmEmailChange('valid-token', 'es');

      expect(emitSpy).toHaveBeenCalledWith(
        EmailEvents.EMAIL_CHANGE_CONFIRMED,
        expect.objectContaining({ email: 'new@test.com', lang: 'es' }),
      );
      expect(emitSpy).toHaveBeenCalledWith(
        EmailEvents.EMAIL_CHANGE_REQUESTED_OLD,
        expect.objectContaining({ previousEmail: 'old@test.com', newEmail: 'new@test.com', lang: 'es' }),
      );
      const oldNotice = emitSpy.mock.calls.find(([event]) => event === EmailEvents.EMAIL_CHANGE_REQUESTED_OLD)?.[1];
      expect(oldNotice.revertToken).toBe(harness.read(user.id, 'emailRevertToken'));
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.revertEmailChange.name}`, () => {
    /** A user whose email was already changed and still has a live revert window. */
    const revertedUser = (): UserMock => {
      const user = new UserMock();
      (user as unknown as Record<string, unknown>).id = 'user-1';
      user.email = 'new@test.com';
      user.previousEmail = 'old@test.com';
      user.emailRevertToken = 'revert-token';
      user.emailRevertExpires = new Date(Date.now() + 60 * 60 * 1000);
      return user;
    };

    /** Writes through the harness and keeps the mocked document readable. */
    const stageUserUpdate = (user: UserMock) =>
      jest.spyOn(userService, 'update').mockImplementation(async (id, data, session) => {
        harness.stage(session, () => harness.write(id, data as Record<string, unknown>));
        Object.assign(user, data);
        return user;
      });

    const stageUnset = (user: UserMock) =>
      jest.spyOn(userService, 'unsetFields').mockImplementation(async (id, fields, session) => {
        for (const field of fields) {
          harness.stage(session, () => {
            const current = { ...(harness.committed[id] ?? {}) };
            delete current[field];
            harness.committed[id] = current;
          });
          delete (user as unknown as Record<string, unknown>)[field];
        }
        return user;
      });

    const stageEpochBump = () =>
      jest.spyOn(userService, 'bumpSessionEpoch').mockImplementation(async (id, session) => {
        harness.stage(session, () => harness.write(id, { sessionEpoch: 1 }));
        return 1;
      });

    it('rejects an unknown revert token with 401 INVALID_TOKEN (S17)', async () => {
      jest.spyOn(userService, 'findByEmailRevertToken').mockResolvedValue(null);
      const bumpSpy = jest.spyOn(userService, 'bumpSessionEpoch');

      await expectDomainError(service.revertEmailChange('unknown-token'), 'INVALID_TOKEN');
      expect(bumpSpy).not.toHaveBeenCalled();
    });

    it('answers 410 EMAIL_REVERT_WINDOW_EXPIRED outside the 72 h window (S5)', async () => {
      const user = revertedUser();
      user.emailRevertExpires = new Date(Date.now() - 1_000);
      jest.spyOn(userService, 'findByEmailRevertToken').mockResolvedValue(user);
      const updateSpy = jest.spyOn(userService, 'update');
      const bumpSpy = jest.spyOn(userService, 'bumpSessionEpoch');

      await expectDomainError(service.revertEmailChange('revert-token'), 'EMAIL_REVERT_WINDOW_EXPIRED');

      expect(updateSpy).not.toHaveBeenCalled();
      expect(bumpSpy).not.toHaveBeenCalled();
    });

    it('restores the previous email and revokes every session in one transaction (S5)', async () => {
      const user = revertedUser();
      jest.spyOn(userService, 'findByEmailRevertToken').mockResolvedValue(user);
      const updateSpy = stageUserUpdate(user);
      stageUnset(user);
      const bumpSpy = stageEpochBump();

      await service.revertEmailChange('revert-token');

      const transactionSession = updateSpy.mock.calls[0][2];
      expect(transactionSession).toBeDefined();
      expect(harness.read(user.id, 'email')).toBe('old@test.com');
      expect(harness.read(user.id, 'previousEmail')).toBeUndefined();
      expect(bumpSpy).toHaveBeenCalledWith(user.id, transactionSession);
      expect(harness.read(user.id, 'sessionEpoch')).toBe(1);
    });

    it('notifies both addresses after reverting (S5, S12)', async () => {
      const user = revertedUser();
      jest.spyOn(userService, 'findByEmailRevertToken').mockResolvedValue(user);
      stageUserUpdate(user);
      stageUnset(user);
      stageEpochBump();
      const emitSpy = jest.spyOn(eventEmitter, 'emit');

      await service.revertEmailChange('revert-token', 'pt');

      const notified = emitSpy.mock.calls
        .filter(([event]) => event === EmailEvents.EMAIL_CHANGE_REVERTED)
        .map(([, payload]) => (payload as { email: string }).email);
      expect(notified).toEqual(expect.arrayContaining(['old@test.com', 'new@test.com']));
      expect(notified).toHaveLength(2);
    });

    it('is idempotent: a second call with the same token answers without writes or notifications (S6)', async () => {
      const user = revertedUser();
      jest.spyOn(userService, 'findByEmailRevertToken').mockResolvedValue(user);
      const updateSpy = stageUserUpdate(user);
      stageUnset(user);
      const bumpSpy = stageEpochBump();

      await service.revertEmailChange('revert-token');

      const emitSpy = jest.spyOn(eventEmitter, 'emit');
      const bumpCalls = bumpSpy.mock.calls.length;
      const updateCalls = updateSpy.mock.calls.length;

      await expect(service.revertEmailChange('revert-token')).resolves.toBeUndefined();

      expect(bumpSpy).toHaveBeenCalledTimes(bumpCalls);
      expect(updateSpy).toHaveBeenCalledTimes(updateCalls);
      expect(emitSpy).not.toHaveBeenCalled();
      expect(harness.read(user.id, 'sessionEpoch')).toBe(1);
      expect(user.email).toBe('old@test.com');
    });

    it('does not fail when the epoch bump fails after a revert (transaction aborts, S5)', async () => {
      const user = revertedUser();
      jest.spyOn(userService, 'findByEmailRevertToken').mockResolvedValue(user);
      stageUserUpdate(user);
      stageUnset(user);
      jest.spyOn(userService, 'bumpSessionEpoch').mockRejectedValue(new Error('mongo down'));

      await expect(service.revertEmailChange('revert-token')).rejects.toThrow('mongo down');

      expect(harness.read(user.id, 'email')).toBeUndefined();
      expect(harness.aborts).toBe(1);
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.login.name} token claims`, () => {
    it('should sign the refresh with a jti and the durable sessionEpoch and leave the access token unchanged', async () => {
      const user = Object.assign(new UserMock(), { sessionEpoch: 3 });
      user.isActive = true;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      const signSpy = jest.spyOn(jwtService, 'sign').mockReturnValue('signed');

      await service.login(user.email, 'correct-password');

      expect(signSpy).toHaveBeenCalledTimes(2);

      const [accessPayload, accessOptions] = signSpy.mock.calls[0] as [Record<string, unknown>, unknown];
      expect(accessPayload).toEqual({ sub: user.id, email: user.email, role: user.role });
      expect(accessPayload).not.toHaveProperty('jti');
      expect(accessPayload).not.toHaveProperty('tv');
      expect(accessOptions).toBeUndefined();

      const [refreshPayload, refreshOptions] = signSpy.mock.calls[1] as [
        Record<string, unknown>,
        { expiresIn?: string; jwtid?: string },
      ];
      expect(refreshPayload.tv).toBe(3);
      expect(refreshPayload).not.toHaveProperty('jti'); // jti is set by the JWT `jwtid` option
      expect(refreshOptions.expiresIn).toBe('7d');
      expect(typeof refreshOptions.jwtid).toBe('string');
      expect(refreshOptions.jwtid).not.toHaveLength(0);
    });

    it('should issue two different refresh token ids on consecutive logins', async () => {
      const user = new UserMock();
      user.isActive = true;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      const signSpy = jest.spyOn(jwtService, 'sign').mockReturnValue('signed');

      await service.login(user.email, 'correct-password');
      await service.login(user.email, 'correct-password');

      const firstJti = (signSpy.mock.calls[1][1] as { jwtid: string }).jwtid;
      const secondJti = (signSpy.mock.calls[3][1] as { jwtid: string }).jwtid;
      expect(firstJti).not.toBe(secondJti);
    });

    it('should stamp tv = 0 when the user document predates the session epoch', async () => {
      const user = new UserMock();
      user.isActive = true;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(true);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      const signSpy = jest.spyOn(jwtService, 'sign').mockReturnValue('signed');

      const result = await service.login(user.email, 'correct-password');

      expect(result).toHaveProperty('refreshToken');
      const [refreshPayload] = signSpy.mock.calls[1] as [Record<string, unknown>];
      expect(refreshPayload.tv).toBe(0);
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.refreshToken.name}`, () => {
    const validUser = () => {
      const user = new UserMock();
      user.isActive = true;
      return user;
    };

    it('should throw DomainError INVALID_REFRESH_TOKEN when JWT verification fails', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expectDomainError(service.refreshToken('malformed-token'), 'INVALID_REFRESH_TOKEN');
    });

    it('should throw DomainError INVALID_TOKEN when user is not found for a valid token', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: 'nonexistent-id',
        email: 'ghost@test.com',
        role: UserRole.USER,
        jti: 'jti-ghost',
        tv: 0,
      } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(null);

      await expectDomainError(service.refreshToken('valid-but-orphaned-token'), 'INVALID_TOKEN');
    });

    it('should reject a token without jti and never consult the store (S13)', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: UserRole.USER,
        tv: 0,
      } as never);

      await expectDomainError(service.refreshToken('legacy-token-without-jti'), 'INVALID_REFRESH_TOKEN');

      expect(mockSessionRevocation.isJtiRevoked).not.toHaveBeenCalled();
    });

    it('should reject a revoked jti (S3/S7)', async () => {
      const user = validUser();
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: user.id, email: user.email, role: user.role, jti: 'jti-revoked', tv: 0 } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      mockSessionRevocation.isJtiRevoked.mockResolvedValue(true);

      await expectDomainError(service.refreshToken('revoked-token'), 'INVALID_REFRESH_TOKEN');
      expect(mockSessionRevocation.isJtiRevoked).toHaveBeenCalledWith('jti-revoked');
    });

    it('should reject a token whose tv is lower than the durable sessionEpoch read from the user document (S16)', async () => {
      const user = Object.assign(validUser(), { sessionEpoch: 2 });
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: user.id, email: user.email, role: user.role, jti: 'jti-old', tv: 1 } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('signed');

      await expectDomainError(service.refreshToken('token-from-revoked-session'), 'INVALID_REFRESH_TOKEN');
      // The epoch is a field of the user document, never a Redis counter.
      expect(userService.findById).toHaveBeenCalledWith(user.id);
    });

    it('should treat a token without tv as version 0 and reject it after a revoke-all', async () => {
      const user = Object.assign(validUser(), { sessionEpoch: 1 });
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: user.id, email: user.email, role: user.role, jti: 'jti-no-tv' } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('signed');

      await expectDomainError(service.refreshToken('token-without-tv'), 'INVALID_REFRESH_TOKEN');
    });

    it('should fail closed when the store cannot answer isJtiRevoked (S11)', async () => {
      const user = validUser();
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: user.id, email: user.email, role: user.role, jti: 'jti-1', tv: 0 } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      mockSessionRevocation.isJtiRevoked.mockRejectedValue(new Error('redis down'));

      await expectDomainError(service.refreshToken('valid-token'), 'INVALID_REFRESH_TOKEN');
    });

    it('should issue new tokens for a non-revoked token with tv equal to the durable sessionEpoch', async () => {
      const user = Object.assign(validUser(), { sessionEpoch: 3 });
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: user.id, email: user.email, role: user.role, jti: 'jti-1', tv: 3 } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      const signSpy = jest.spyOn(jwtService, 'sign').mockReturnValue('fresh-token');

      const result = await service.refreshToken('valid-token');

      expect(result.accessToken).toBe('fresh-token');
      expect(result.refreshToken).toBe('fresh-token');
      expect(signSpy).toHaveBeenCalledTimes(2);

      // The rotated refresh keeps the epoch of the user document (S16).
      const [refreshPayload] = signSpy.mock.calls[1] as [Record<string, unknown>];
      expect(refreshPayload.tv).toBe(3);
      // The store is only consulted for the jti denylist, never for the epoch.
      expect(mockSessionRevocation.isJtiRevoked).toHaveBeenCalledWith('jti-1');
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.logout.name}`, () => {
    it('should throw DomainError INVALID_REFRESH_TOKEN when the signature does not verify', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expectDomainError(service.logout('broken-token'), 'INVALID_REFRESH_TOKEN');
      expect(mockSessionRevocation.revokeJti).not.toHaveBeenCalled();
    });

    it('should reject a token without jti (S13)', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: UserRole.USER,
        exp: Math.floor(Date.now() / 1000) + 600,
      } as never);

      await expectDomainError(service.logout('legacy-token'), 'INVALID_REFRESH_TOKEN');
      expect(mockSessionRevocation.revokeJti).not.toHaveBeenCalled();
    });

    it('should revoke the jti with the token expiration as TTL input (S6)', async () => {
      const exp = Math.floor(Date.now() / 1000) + 600;
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: 'user-1', email: 'user@test.com', role: UserRole.USER, jti: 'jti-9', exp } as never);

      await service.logout('valid-token');

      expect(mockSessionRevocation.revokeJti).toHaveBeenCalledWith('jti-9', exp);
    });

    it('should propagate store failures instead of reporting a successful logout', async () => {
      jest.spyOn(jwtService, 'verify').mockReturnValue({
        sub: 'user-1',
        email: 'user@test.com',
        role: UserRole.USER,
        jti: 'jti-9',
        exp: Math.floor(Date.now() / 1000) + 600,
      } as never);
      mockSessionRevocation.revokeJti.mockRejectedValue(new Error('redis down'));

      await expect(service.logout('valid-token')).rejects.toThrow('redis down');
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.logoutAll.name}`, () => {
    it('should bump the durable session epoch of the user (S8, S16)', async () => {
      const bumpSpy = jest.spyOn(userService, 'bumpSessionEpoch').mockResolvedValue(1);

      await service.logoutAll('user-42');

      expect(bumpSpy).toHaveBeenCalledWith('user-42');
    });

    it('should propagate bump failures instead of reporting a successful logout', async () => {
      jest.spyOn(userService, 'bumpSessionEpoch').mockRejectedValue(new Error('mongo down'));

      await expect(service.logoutAll('user-42')).rejects.toThrow('mongo down');
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.validateUser.name}`, () => {
    it('should return cached user with permissions resolved from the role on a cache hit', async () => {
      const user = new UserMock();
      user.permissions = [];
      const findByIdSpy = jest.spyOn(userService, 'findById');
      const rolePermissionsSpy = jest
        .spyOn(roleService, 'getPermissionsForRole')
        .mockResolvedValue(['user:read', 'user:update']);
      mockCacheService.get.mockResolvedValue(user as unknown as User);

      const result = await service.validateUser(user.id);

      expect(result.permissions).toEqual(['user:read', 'user:update']);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:${user.id}`);
      expect(findByIdSpy).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
      expect(rolePermissionsSpy).toHaveBeenCalledWith(user.role);
      // Clone must not be the same object (nor mutate the cached document)
      expect(result).not.toBe(user);
      expect(user.permissions).toEqual([]);
    });

    it('should query DB on cache miss, cache the RAW document and never mutate it', async () => {
      const userId = 'u-1';
      const rawPermissions = ['audit:read'];
      const plainFields = {
        id: userId,
        email: 'a@b.com',
        userName: 'a',
        name: 'A',
        lastName: 'B',
        role: UserRole.USER,
        permissions: rawPermissions,
        isActive: true,
      };
      // Simulates a hydrated Mongoose document exposing `toObject()`.
      const docLike = { ...plainFields, toObject: () => ({ ...plainFields }) } as unknown as User;
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(roleService, 'getPermissionsForRole').mockResolvedValue(['user:read', 'user:update']);
      jest.spyOn(userService, 'findById').mockResolvedValue(docLike);

      const result = await service.validateUser(userId);

      expect(result.permissions).toEqual(['user:read', 'user:update', 'audit:read']);
      expect(userService.findById).toHaveBeenCalledWith(userId);
      // The source document (and its permissions array) must NOT be mutated
      expect(docLike.permissions).toEqual(['audit:read']);
      expect(rawPermissions).toEqual(['audit:read']);
      // Cache stores the RAW source, never the effective copy
      expect(mockCacheService.set).toHaveBeenCalledWith(`user:${userId}`, docLike);
      expect(result).not.toBe(docLike);
    });

    it('should fall through to DB when cache.get returns undefined', async () => {
      const user = new UserMock();
      user.permissions = [];
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(roleService, 'getPermissionsForRole').mockResolvedValue([]);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);

      const result = await service.validateUser(user.id);

      expect(userService.findById).toHaveBeenCalled();
      expect(result.permissions).toEqual([]);
    });

    it('should union explicit permissions (deduplicated, role first)', async () => {
      const user = new UserMock();
      user.permissions = ['user:read', 'audit:read'];
      mockCacheService.get.mockResolvedValue(user as unknown as User);
      jest.spyOn(roleService, 'getPermissionsForRole').mockResolvedValue(['user:read', 'user:update']);

      const result = await service.validateUser(user.id);

      expect(result.permissions).toEqual(['user:read', 'user:update', 'audit:read']);
    });

    it('should pass a wildcard role permission through unchanged', async () => {
      const user = new UserMock();
      user.permissions = [];
      mockCacheService.get.mockResolvedValue(user as unknown as User);
      jest.spyOn(roleService, 'getPermissionsForRole').mockResolvedValue(['*']);

      const result = await service.validateUser(user.id);

      expect(result.permissions).toContain('*');
      expect(result.permissions).toEqual(['*']);
    });

    it('should return only explicit permissions when the role yields none (no throw)', async () => {
      const user = new UserMock();
      user.permissions = ['audit:read'];
      mockCacheService.get.mockResolvedValue(user as unknown as User);
      jest.spyOn(roleService, 'getPermissionsForRole').mockResolvedValue([]);

      const result = await service.validateUser(user.id);

      expect(result.permissions).toEqual(['audit:read']);
    });

    it('should tolerate an unresolved role (undefined) without throwing', async () => {
      const user = new UserMock();
      user.permissions = [];
      mockCacheService.get.mockResolvedValue(user as unknown as User);
      jest
        .spyOn(roleService, 'getPermissionsForRole')
        .mockResolvedValue(undefined as unknown as string[]);

      const result = await service.validateUser(user.id);

      expect(result.permissions).toEqual([]);
    });
  });
});
