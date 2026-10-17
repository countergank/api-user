import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainError } from '../../common/errors/domain.error';
import { CacheService } from '../../config/cache';
import { Permission } from '../../rbac/entities/permission.entity';
import { Mock } from '../../test-utils';
import { UserMock } from '../mocks/user.mock';
import { UserRepository } from '../repository/user.repository';
import { UserService } from './user.service';

/**
 * Transactional write store for the S17 tests.
 *
 * It reproduces the two properties MongoDB gives us: a write executed with a
 * session only becomes visible when the enclosing transaction resolves, and a
 * rejection discards every staged write. A write without a session commits
 * immediately — which is exactly the hole S17 closes.
 */
class FakeTransactionStore {
  /** What a reader sees after the last committed transaction. */
  readonly committed: Record<string, Record<string, unknown>> = {};

  private staged: Array<() => void> = [];

  readonly connection = {
    startSession: jest.fn(async () => {
      this.staged = [];
      const session = {
        withTransaction: jest.fn(async (callback: (session: unknown) => Promise<unknown>) => {
          const result = await callback(session);
          // Commit: only now do the staged writes become visible.
          for (const apply of this.staged) apply();
          this.staged = [];
          return result;
        }),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      return session;
    }),
  };

  /** Records a write the way the repository does, honouring the session. */
  write(id: string, data: Record<string, unknown>, session?: unknown): void {
    const apply = () => {
      this.committed[id] = { ...(this.committed[id] ?? {}), ...data };
    };

    if (session) {
      this.staged.push(apply);
      return;
    }

    apply();
  }

  read(id: string, field: string): unknown {
    return this.committed[id]?.[field];
  }
}

/**
 * Wiring test for S4/S9/S16/S17: the flows that change a user's credentials must
 * bump the durable session epoch of that user, in the same transaction as the
 * credential write. It lives next to the revocation feature because it asserts
 * the revocation contract, not the user service internals.
 */
describe(`${UserService.name}.${UserService.prototype.changePassword.name} session revocation`, () => {
  let service: UserService;
  let store: FakeTransactionStore;
  let user: UserMock;
  let userRepository: {
    findById: jest.Mock;
    update: jest.Mock;
    bumpSessionEpoch: jest.Mock;
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    store = new FakeTransactionStore();
    user = new UserMock();

    userRepository = {
      findById: jest.fn().mockResolvedValue(user),
      update: jest.fn(async (id: string, data: Record<string, unknown>, session?: unknown) => {
        store.write(id, data, session);
        return user;
      }),
      bumpSessionEpoch: jest.fn(async (id: string, session?: unknown) => {
        const next = Number(store.read(id, 'sessionEpoch') ?? 0) + 1;
        store.write(id, { sessionEpoch: next }, session);
        return Object.assign(user, { sessionEpoch: next });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    })
      .overrideProvider(UserRepository)
      .useValue(userRepository)
      .useMocker((token) => {
        if (token === getConnectionToken()) return store.connection;
        if (token === CacheService) return mockCacheService;
        if (token === getModelToken(Permission.name)) return { find: jest.fn() };
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<UserService>(UserService);
    jest.spyOn(service, 'validatePassword').mockResolvedValue(true);
    jest.spyOn(service, 'hashPassword').mockResolvedValue('hashed');
  });

  it('bumps the durable session epoch of the user instead of writing a Redis counter (S9, S16)', async () => {
    await service.changePassword(user.id, 'current-password', 'new-password');

    expect(userRepository.bumpSessionEpoch).toHaveBeenCalledTimes(1);
    expect(store.read(user.id, 'password')).toBe('hashed');
    expect(store.read(user.id, 'sessionEpoch')).toBe(1);
  });

  it('commits the new password and the epoch bump inside the same transaction (S17)', async () => {
    await service.changePassword(user.id, 'current-password', 'new-password');

    const [updateId, , updateSession] = userRepository.update.mock.calls[0];
    const [bumpId, bumpSession] = userRepository.bumpSessionEpoch.mock.calls[0];

    expect(updateId).toBe(user.id);
    expect(bumpId).toBe(user.id);
    expect(updateSession).toBeDefined();
    expect(bumpSession).toBe(updateSession);
  });

  it('does not persist the password change when the epoch bump fails (S17)', async () => {
    userRepository.bumpSessionEpoch.mockRejectedValue(new Error('mongo write concern failed'));

    await expect(service.changePassword(user.id, 'current-password', 'new-password')).rejects.toThrow(
      'mongo write concern failed',
    );

    // The transaction aborted: nothing of the credential change survived.
    expect(store.committed[user.id]).toBeUndefined();
  });

  it('does not write anything when the current password is wrong', async () => {
    jest.spyOn(service, 'validatePassword').mockResolvedValue(false);

    await expect(service.changePassword(user.id, 'wrong-password', 'new-password')).rejects.toBeInstanceOf(DomainError);

    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.bumpSessionEpoch).not.toHaveBeenCalled();
    expect(store.committed).toEqual({});
  });
});
