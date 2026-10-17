import { getConnectionToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainError } from '../../common/errors/domain.error';
import { CacheService } from '../../config/cache';
import { Mock } from '../../test-utils';
import { UserMock } from '../mocks/user.mock';
import { UserRepository } from '../repository/user.repository';
import { UserService } from './user.service';
import { SessionRevocationService } from '../../session/session-revocation.service';

/**
 * Wiring test for S4/S9: the flows that change a user's credentials must revoke
 * every session of that user. It lives next to the revocation feature because
 * it asserts the store contract, not the user service internals.
 */
describe(`${UserService.name}.${UserService.prototype.changePassword.name} session revocation`, () => {
  let service: UserService;
  let userRepository: {
    findById: jest.Mock;
    update: jest.Mock;
  };

  const mockSessionRevocation = {
    revokeJti: jest.fn().mockResolvedValue(undefined),
    isJtiRevoked: jest.fn().mockResolvedValue(false),
    revokeAllForUser: jest.fn().mockResolvedValue(1),
    getUserEpoch: jest.fn().mockResolvedValue(0),
  };

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
    mockSessionRevocation.revokeAllForUser.mockResolvedValue(1);

    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    })
      .overrideProvider(UserRepository)
      .useValue(userRepository)
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (token === CacheService) return mockCacheService;
        if (token === SessionRevocationService) return mockSessionRevocation;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<UserService>(UserService);
  });

  it('revokes every session of the user after a successful password change (S9)', async () => {
    const user = new UserMock();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockResolvedValue(user);
    jest.spyOn(service, 'validatePassword').mockResolvedValue(true);
    jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed');

    await service.changePassword(user.id, 'current-password', 'new-password');

    expect(mockSessionRevocation.revokeAllForUser).toHaveBeenCalledWith(user.id);
  });

  it('does not revoke sessions when the current password is wrong', async () => {
    const user = new UserMock();
    userRepository.findById.mockResolvedValue(user);
    jest.spyOn(service, 'validatePassword').mockResolvedValue(false);

    await expect(service.changePassword(user.id, 'wrong-password', 'new-password')).rejects.toBeInstanceOf(DomainError);

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(mockSessionRevocation.revokeAllForUser).not.toHaveBeenCalled();
  });

  it('propagates store failures so the caller never believes the sessions were closed', async () => {
    const user = new UserMock();
    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockResolvedValue(user);
    jest.spyOn(service, 'validatePassword').mockResolvedValue(true);
    jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed');
    mockSessionRevocation.revokeAllForUser.mockRejectedValue(new Error('redis down'));

    await expect(service.changePassword(user.id, 'current-password', 'new-password')).rejects.toThrow('redis down');
  });
});
