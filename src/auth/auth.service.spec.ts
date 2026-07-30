import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getConnectionToken } from '@nestjs/mongoose';
import { AccountLockedException } from '../common/errors/account-locked.exception';
import { User, UserRole } from '../user/entities/user.entity';
import { UserService } from '../user/service/user.service';
import { AuthService } from './auth.service';
import { UserMock } from '../user/mocks/user.mock';
import { Mock } from '../../test/helpers';
import { CacheService } from '../config/cache';

describe(AuthService.name, () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const mockUser = new UserMock().randomize();

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, UserService, JwtService, EventEmitter2, ConfigService],
    })
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (token === CacheService) return mockCacheService;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe(`${AuthService.name}.${AuthService.prototype.login.name}`, () => {
    it('should throw UnauthorizedException for non-existent user', async () => {
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expect(service.login('nonexistent@test.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw AccountLockedException when account is locked', async () => {
      const lockedUser = new UserMock();
      lockedUser.failedLoginAttempts = 5;
      lockedUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(lockedUser);
      jest.spyOn(configService, 'get').mockReturnValue(5); // MAX_LOGIN_ATTEMPTS

      await expect(service.login(lockedUser.email, 'any')).rejects.toThrow(
        AccountLockedException,
      );
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

    it('should increment failedLoginAttempts on wrong password', async () => {
      const user = new UserMock();
      user.failedLoginAttempts = 2;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(false);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      jest.spyOn(configService, 'get').mockReturnValue(10); // MAX_LOGIN_ATTEMPTS high enough to not trigger lock

      await expect(service.login(user.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(userService.update).toHaveBeenCalledWith(user.id, {
        failedLoginAttempts: 3,
      });
    });

    it('should lock account when failed attempts reach MAX_LOGIN_ATTEMPTS', async () => {
      const user = new UserMock();
      user.failedLoginAttempts = 4;

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(user);
      jest.spyOn(userService, 'validatePassword').mockResolvedValue(false);
      jest.spyOn(userService, 'update').mockResolvedValue(user);
      jest.spyOn(configService, 'get').mockReturnValueOnce(5); // MAX_LOGIN_ATTEMPTS
      jest.spyOn(configService, 'get').mockReturnValueOnce(15); // LOCKOUT_DURATION_MINUTES

      await expect(service.login(user.email, 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );

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

    it('should check lockout BEFORE password validation (security)', async () => {
      const lockedUser = new UserMock();
      lockedUser.failedLoginAttempts = 5;
      lockedUser.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);

      jest.spyOn(userService, 'findByEmail').mockResolvedValue(lockedUser);
      const validatePasswordSpy = jest.spyOn(userService, 'validatePassword');
      jest.spyOn(configService, 'get').mockReturnValue(5);

      await expect(service.login(lockedUser.email, 'any-password')).rejects.toThrow(
        AccountLockedException,
      );

      // Password validation should NOT be called for locked accounts
      expect(validatePasswordSpy).not.toHaveBeenCalled();
    });
  });

  describe(`${AuthService.name}.${AuthService.prototype.validateUser.name}`, () => {
    it('should return cached user on cache hit', async () => {
      const user = new UserMock();
      const findByIdSpy = jest.spyOn(userService, 'findById');
      mockCacheService.get.mockResolvedValue(user as any);

      const result = await service.validateUser(user.id);

      expect(result).toEqual(user);
      expect(mockCacheService.get).toHaveBeenCalledWith(`user:${user.id}`);
      expect(findByIdSpy).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should query DB on cache miss and populate cache', async () => {
      const user = new UserMock();
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);

      const result = await service.validateUser(user.id);

      expect(result).toEqual(user);
      expect(userService.findById).toHaveBeenCalledWith(user.id);
      expect(mockCacheService.set).toHaveBeenCalledWith(`user:${user.id}`, user);
    });

    it('should fall through to DB when cache.get returns undefined', async () => {
      const user = new UserMock();
      mockCacheService.get.mockResolvedValue(undefined);
      jest.spyOn(userService, 'findById').mockResolvedValue(user);

      const result = await service.validateUser(user.id);

      expect(userService.findById).toHaveBeenCalled();
      expect(result).toEqual(user);
    });
  });
});
