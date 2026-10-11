import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { DomainError } from '../common/errors/domain.error';
import { User, UserRole } from '../user/entities/user.entity';
import { UserService } from '../user/service/user.service';
import { Role } from '../rbac/entities/role.entity';
import { RoleService } from '../rbac/services/role.service';
import { AuthService } from './auth.service';
import { UserMock } from '../user/mocks/user.mock';
import { Mock } from '../test-utils';
import { CacheService } from '../config/cache';

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

describe(AuthService.name, () => {
  let service: AuthService;
  let userService: UserService;
  let roleService: RoleService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UserService, RoleService, JwtService, EventEmitter2, ConfigService],
    })
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (token === getModelToken(Role.name)) return {};
        if (token === CacheService) return mockCacheService;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    roleService = module.get<RoleService>(RoleService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
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
  });

  describe(`${AuthService.name}.${AuthService.prototype.refreshToken.name}`, () => {
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
      } as never);
      jest.spyOn(userService, 'findById').mockResolvedValue(null);

      await expectDomainError(service.refreshToken('valid-but-orphaned-token'), 'INVALID_TOKEN');
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
