import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { authenticator } from 'otplib';
import { DomainError } from '../../common/errors/domain.error';
import { User } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { TWO_FACTOR_MAX_ATTEMPTS, TwoFactorService } from './two-factor.service';
import { decryptTotpSecret } from './totp-cipher';

const ENCRYPTION_PASSWORD = 'unit-test-encryption-password';

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

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let userService: {
    findById: jest.Mock;
    update: jest.Mock;
    unsetFields: jest.Mock;
    incrementTwoFactorAttempts: jest.Mock;
    purgeTwoFactorEnrollment: jest.Mock;
  };

  const baseUser = {
    id: 'user-1',
    email: 'user@example.com',
    twoFactorEnabled: false,
  } as unknown as User;

  const totp = authenticator.clone({ window: 1 });

  /** A code that cannot verify against the secret in any tolerated step. */
  function wrongCodeFor(secret: string): string {
    const valid = authenticator.generate(secret);
    for (let delta = 1; delta <= 10; delta++) {
      const candidate = `${(Number(valid[0]) + delta) % 10}${valid.slice(1)}`;
      if (!totp.verify({ token: candidate, secret })) {
        return candidate;
      }
    }
    throw new Error('no wrong code could be derived');
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: UserService,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
            unsetFields: jest.fn(),
            incrementTwoFactorAttempts: jest.fn(),
            purgeTwoFactorEnrollment: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue(ENCRYPTION_PASSWORD),
            get: jest.fn().mockReturnValue('api-user'),
          },
        },
      ],
    }).compile();

    service = module.get(TwoFactorService);
    userService = module.get(UserService);
  });

  /** Runs enroll and returns what was persisted, replaying it into findById. */
  async function enrollAndPersist(): Promise<{ secret: string; persistedSecret: string }> {
    userService.findById.mockResolvedValue(baseUser);
    userService.update.mockImplementation(async (_id: string, data: Record<string, unknown>) => ({
      ...baseUser,
      ...data,
    }));

    const result = await service.enroll('user-1', 'user@example.com');
    const persistedSecret = userService.update.mock.calls[0][1].twoFactorSecret as string;
    return { secret: result.secret, persistedSecret };
  }

  describe('enroll', () => {
    it('returns the base32 secret and otpauth URL, persisting only ciphertext with twoFactorEnabled false', async () => {
      const { secret, persistedSecret } = await enrollAndPersist();

      expect(secret).toMatch(/^[A-Z2-7]+$/);
      const { otpauthUrl } = await service.enroll('user-1', 'user@example.com');
      expect(otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
      expect(persistedSecret).not.toBe(secret);
      expect(persistedSecret).toMatch(/^v1:/);
      expect(decryptTotpSecret(persistedSecret, ENCRYPTION_PASSWORD)).toBe(secret);
      expect(userService.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ twoFactorEnabled: false, twoFactorAttempts: 0 }),
      );
    });

    it('invalidates the previous secret when re-enrolling', async () => {
      const first = await enrollAndPersist();
      userService.update.mockClear();

      const second = await enrollAndPersist();

      expect(second.secret).not.toBe(first.secret);
      const persisted = userService.update.mock.calls[0][1].twoFactorSecret as string;
      expect(decryptTotpSecret(persisted, ENCRYPTION_PASSWORD)).toBe(second.secret);
    });

    it('only checks the user exists, without loading the secret', async () => {
      userService.findById.mockResolvedValue(baseUser);
      userService.update.mockResolvedValue(baseUser);

      await service.enroll('user-1', 'user@example.com');

      expect(userService.findById).toHaveBeenCalledWith('user-1');
      expect(userService.findById).toHaveBeenCalledTimes(1);
    });
  });

  describe('activate', () => {
    it('enables two-factor when the code matches the pending secret', async () => {
      const { secret, persistedSecret } = await enrollAndPersist();
      const code = authenticator.generate(secret);
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorSecret: persistedSecret });
      userService.update.mockClear();

      await service.activate('user-1', code);

      expect(userService.update).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ twoFactorEnabled: true, twoFactorAttempts: 0 }),
      );
    });

    it('rejects an invalid code with a single atomic attempt increment', async () => {
      const { secret, persistedSecret } = await enrollAndPersist();
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorSecret: persistedSecret });
      userService.update.mockClear();

      await expectDomainError(service.activate('user-1', wrongCodeFor(secret)), 'INVALID_TWO_FACTOR_CODE');

      expect(userService.incrementTwoFactorAttempts).toHaveBeenCalledTimes(1);
      expect(userService.incrementTwoFactorAttempts).toHaveBeenCalledWith('user-1');
      expect(userService.update).not.toHaveBeenCalled();
      expect(userService.unsetFields).not.toHaveBeenCalled();
    });

    it('purges the pending secret in a single write after the attempt budget is exhausted', async () => {
      const { secret, persistedSecret } = await enrollAndPersist();
      userService.findById.mockResolvedValue({
        ...baseUser,
        twoFactorSecret: persistedSecret,
        twoFactorAttempts: TWO_FACTOR_MAX_ATTEMPTS - 1,
      });
      userService.update.mockClear();

      await expectDomainError(service.activate('user-1', wrongCodeFor(secret)), 'INVALID_TWO_FACTOR_CODE');

      expect(userService.purgeTwoFactorEnrollment).toHaveBeenCalledTimes(1);
      expect(userService.purgeTwoFactorEnrollment).toHaveBeenCalledWith('user-1');
      expect(userService.unsetFields).not.toHaveBeenCalled();
      expect(userService.update).not.toHaveBeenCalled();
    });

    it('maps an undecryptable stored secret to TWO_FACTOR_NOT_ENROLLED instead of a 500', async () => {
      userService.findById.mockResolvedValue({ ...baseUser, twoFactorSecret: 'v1:garbage' });

      await expectDomainError(service.activate('user-1', '123456'), 'TWO_FACTOR_NOT_ENROLLED');

      expect(userService.update).not.toHaveBeenCalled();
      expect(userService.incrementTwoFactorAttempts).not.toHaveBeenCalled();
    });

    it('rejects activation without a pending enrollment', async () => {
      userService.findById.mockResolvedValue(baseUser);

      await expectDomainError(service.activate('user-1', '123456'), 'TWO_FACTOR_NOT_ENROLLED');
    });

    it('rejects activation when the budget is already exhausted', async () => {
      userService.findById.mockResolvedValue({
        ...baseUser,
        twoFactorSecret: 'v1:x:y:z',
        twoFactorAttempts: TWO_FACTOR_MAX_ATTEMPTS,
      });

      await expectDomainError(service.activate('user-1', '123456'), 'TWO_FACTOR_NOT_ENROLLED');
    });
  });
});
