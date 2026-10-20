import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Mock } from '../../test-utils';
import { Permission } from '../../rbac/entities/permission.entity';
import { AUDIT_ACTION_KEY } from '../../common/audit/audit.decorator';
import { DomainError } from '../../common/errors/domain.error';
import { CacheService } from '../../config/cache';
import { User } from '../entities/user.entity';
import { UserMock } from '../mocks/user.mock';
import { UserRepository } from '../repository/user.repository';
import {
  EMAIL_CHANGE_CODE_MAX_ATTEMPTS,
  EMAIL_CHANGE_CODE_RESEND_INTERVAL_MS,
  EMAIL_CHANGE_CODE_TTL_MS,
  hashEmailChangeCode,
} from './email-change-code';
import { UserService } from './user.service';

/** Assert a DomainError carrying the expected ErrorKind. */
async function expectDomainError(promise: Promise<unknown>, kind: string): Promise<DomainError> {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(DomainError);
  expect((thrown as DomainError).kind.kind).toBe(kind);
  return thrown as DomainError;
}

describe(`${UserService.name} — email change code lifecycle (COU-263)`, () => {
  let service: UserService;
  let stored: UserMock;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  /** In-memory stand-in for the user document so writes are observable. */
  const userRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
    unsetFields: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    stored = new UserMock();
    stored.email = 'current@example.com';
    // The `id` virtual of a hydrated Mongoose document, which the salt uses.
    (stored as unknown as Record<string, unknown>).id = 'user-1';

    userRepository.findById.mockImplementation(async () => stored);
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.update.mockImplementation(async (_id: string, data: Partial<User>) => {
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          (stored as unknown as Record<string, unknown>)[key] = value;
        }
      }
      return stored;
    });
    userRepository.unsetFields.mockImplementation(async (_id: string, fields: string[]) => {
      for (const field of fields) {
        delete (stored as unknown as Record<string, unknown>)[field];
      }
      return stored;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    })
      .overrideProvider(UserRepository)
      .useValue(userRepository)
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (token === CacheService) return mockCacheService;
        if (token === getModelToken(Permission.name)) return { find: jest.fn() };
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<UserService>(UserService);
  });

  describe(UserService.prototype.requestEmailChangeCode.name, () => {
    it('issues a six-digit code and stores only its salted sha256 hash (S2, S11)', async () => {
      const { code, expires } = await service.requestEmailChangeCode(stored.id);

      expect(code).toMatch(/^\d{6}$/);
      expect(stored.emailChangeCodeHash).toBe(createHash('sha256').update(`${stored.id}:${code}`).digest('hex'));
      expect(stored.emailChangeCodeHash).toBe(hashEmailChangeCode(code, stored.id));
      expect(stored.emailChangeCodeHash).not.toBe(code);
      expect(stored.emailChangeCodeAttempts).toBe(0);
      expect(stored.emailChangeCodeSentAt).toBeInstanceOf(Date);
      expect(expires.getTime()).toBeGreaterThan(Date.now() + EMAIL_CHANGE_CODE_TTL_MS - 5_000);
      expect(expires.getTime()).toBeLessThanOrEqual(Date.now() + EMAIL_CHANGE_CODE_TTL_MS);
    });

    it('never writes the plaintext code to the user document (S8)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);

      const [, payload] = userRepository.update.mock.calls[0] as [string, Record<string, unknown>];
      expect(Object.values(payload)).not.toContain(code);
      expect(JSON.stringify(stored)).not.toContain(code);
    });

    it('rejects a resend before the 60 second window and allows it afterwards (S11)', async () => {
      const first = await service.requestEmailChangeCode(stored.id);

      await expectDomainError(service.requestEmailChangeCode(stored.id), 'VALIDATION_ERROR');
      expect(stored.emailChangeCodeHash).toBe(hashEmailChangeCode(first.code, stored.id));

      stored.emailChangeCodeSentAt = new Date(Date.now() - EMAIL_CHANGE_CODE_RESEND_INTERVAL_MS - 1_000);
      const second = await service.requestEmailChangeCode(stored.id);

      expect(second.code).toMatch(/^\d{6}$/);
      expect(stored.emailChangeCodeHash).toBe(hashEmailChangeCode(second.code, stored.id));
      expect(stored.emailChangeCodeSentAt.getTime()).toBeGreaterThan(
        Date.now() - EMAIL_CHANGE_CODE_RESEND_INTERVAL_MS,
      );
    });
  });

  describe(UserService.prototype.requestEmailChange.name, () => {
    const target = 'new@example.com';

    it('stages the pending email when the code matches and consumes the code (S2, S3)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);

      const result = await service.requestEmailChange(stored.id, { email: target, code });

      expect(result.token).toBeDefined();
      expect(stored.pendingEmail).toBe(target);
      expect(stored.pendingEmailToken).toBe(result.token);
      expect(stored.emailChangeCodeHash).toBeUndefined();
      expect(stored.emailChangeCodeExpires).toBeUndefined();
    });

    it('rejects a reused code with 401 INVALID_EMAIL_CHANGE_CODE (S1, S2)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);
      await service.requestEmailChange(stored.id, { email: target, code });

      await expectDomainError(
        service.requestEmailChange(stored.id, { email: 'other@example.com', code }),
        'INVALID_EMAIL_CHANGE_CODE',
      );
    });

    it('rejects a wrong code with 401 and increments the attempt counter (S1, S11)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);
      const wrong = code === '000000' ? '111111' : '000000';

      await expectDomainError(
        service.requestEmailChange(stored.id, { email: target, code: wrong }),
        'INVALID_EMAIL_CHANGE_CODE',
      );

      expect(stored.emailChangeCodeAttempts).toBe(1);
      expect(stored.emailChangeCodeHash).toBe(hashEmailChangeCode(code, stored.id));
      expect(stored.pendingEmail).toBeUndefined();
    });

    it('invalidates the code after 5 failed attempts, so even the right code is rejected (S1, S11)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);
      const wrong = code === '000000' ? '111111' : '000000';

      for (let attempt = 0; attempt < EMAIL_CHANGE_CODE_MAX_ATTEMPTS; attempt += 1) {
        await expectDomainError(
          service.requestEmailChange(stored.id, { email: target, code: wrong }),
          'INVALID_EMAIL_CHANGE_CODE',
        );
      }

      expect(stored.emailChangeCodeHash).toBeUndefined();
      await expectDomainError(
        service.requestEmailChange(stored.id, { email: target, code }),
        'INVALID_EMAIL_CHANGE_CODE',
      );
      expect(stored.pendingEmail).toBeUndefined();
    });

    it('rejects an expired code with 401 (S1, S2)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);
      stored.emailChangeCodeExpires = new Date(Date.now() - 1_000);

      await expectDomainError(
        service.requestEmailChange(stored.id, { email: target, code }),
        'INVALID_EMAIL_CHANGE_CODE',
      );

      expect(stored.emailChangeCodeHash).toBeUndefined();
    });

    it('rejects a request without any code issued (S1)', async () => {
      await expectDomainError(
        service.requestEmailChange(stored.id, { email: target, code: '123456' }),
        'INVALID_EMAIL_CHANGE_CODE',
      );
    });

    it('rejects the current email with 400 and does not consume the code (S7)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);

      await expectDomainError(
        service.requestEmailChange(stored.id, { email: stored.email, code }),
        'VALIDATION_ERROR',
      );

      expect(stored.emailChangeCodeHash).toBe(hashEmailChangeCode(code, stored.id));
      expect(stored.emailChangeCodeAttempts).toBe(0);
      expect(stored.pendingEmail).toBeUndefined();
    });

    it('rejects an email owned by another user only after the code is proven (S1)', async () => {
      const { code } = await service.requestEmailChangeCode(stored.id);
      userRepository.findByEmail.mockResolvedValue(new UserMock());

      await expectDomainError(service.requestEmailChange(stored.id, { email: target, code }), 'EMAIL_ALREADY_EXISTS');
    });

    it('reports an invalid code before revealing whether the target email exists (S1)', async () => {
      await service.requestEmailChangeCode(stored.id);
      userRepository.findByEmail.mockResolvedValue(new UserMock());

      await expectDomainError(
        service.requestEmailChange(stored.id, { email: target, code: 'not-the-code' }),
        'INVALID_EMAIL_CHANGE_CODE',
      );
      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('audit redaction (S8, S14)', () => {
    it('never puts the code in the audit context of the email change request', () => {
      const config = Reflect.getMetadata(AUDIT_ACTION_KEY, UserService.prototype.requestEmailChange) as {
        getBefore?: (...args: unknown[]) => unknown;
      };

      expect(config).toBeDefined();
      const before = config.getBefore?.('user-1', { email: 'new@example.com', code: '654321' });
      expect(JSON.stringify(before)).not.toContain('654321');
    });

    it('never puts the code in the audit context of the code request', () => {
      const config = Reflect.getMetadata(AUDIT_ACTION_KEY, UserService.prototype.requestEmailChangeCode) as {
        getBefore?: (...args: unknown[]) => unknown;
        getAfter?: (result: unknown) => unknown;
      };

      expect(config).toBeDefined();
      // The handler receives the user id only: the code never reaches the audit
      // context, and the request result carries a message, not the code.
      const before = config.getBefore?.('user-1');
      const after = config.getAfter?.({ message: 'email_change_code_sent' });
      expect(JSON.stringify({ before, after })).not.toMatch(/\b\d{6}\b/);
    });
  });
});
