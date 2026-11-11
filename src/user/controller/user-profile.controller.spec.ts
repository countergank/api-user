import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../test-utils';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { EmailEvents } from '../../email/constants/email.events';
import { AuthService } from '../../auth/auth.service';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { UserMock } from '../mocks/user.mock';
import { UserService } from '../service/user.service';
import { UserProfileController } from './user-profile.controller';

describe(UserProfileController.name, () => {
  let controller: UserProfileController;
  let mockEventEmitter: { emit: jest.Mock };

  const user = new UserMock();

  const sessionContext = () =>
    ({
      ip: '10.0.0.1',
      userAgent: 'agent A',
    }) as never;

  const mockAuthService = {
    rotateCurrentSession: jest.fn().mockResolvedValue({
      sessionId: 'session-live',
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: { id: user.id, email: user.email, userName: 'u', name: 'n', lastName: 'l' },
    }),
  };

  const mockUserService = {
    update: jest.fn().mockResolvedValue(user),
    updateProfilePhoto: jest.fn(),
    changePassword: jest.fn().mockResolvedValue(undefined),
    requestEmailChange: jest.fn().mockResolvedValue({ token: 'token', expires: new Date(), user }),
    requestEmailChangeCode: jest
      .fn()
      .mockResolvedValue({ code: '123456', expires: new Date(), user }),
  };

  beforeEach(async () => {
    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: I18nService, useValue: { translate: jest.fn().mockResolvedValue('Password changed') } },
      ],
    })
      .useMocker((token) => {
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<UserProfileController>(UserProfileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`${UserProfileController.prototype.changePassword.name}`, () => {
    it('should delegate to service, emit PASSWORD_CHANGED and return message on success', async () => {
      mockUserService.changePassword.mockResolvedValue(undefined);

      const dto: ChangePasswordDTO = {
        currentPassword: 'CorrectPass123@',
        newPassword: 'NewSecurePass123@',
      };

      const result = await controller.changePassword(user as any, dto, undefined);

      expect(mockUserService.changePassword).toHaveBeenCalledWith(
        user.id,
        dto.currentPassword,
        dto.newPassword,
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EmailEvents.PASSWORD_CHANGED, expect.any(Object));
      expect(result).toEqual({ message: 'Password changed' });
    });

    it('should propagate CURRENT_PASSWORD_INCORRECT DomainError from service', async () => {
      mockUserService.changePassword.mockRejectedValueOnce(DomainError.fromKind('CURRENT_PASSWORD_INCORRECT'));

      const dto: ChangePasswordDTO = {
        currentPassword: 'wrong',
        newPassword: 'NewSecurePass456@',
      };

      await expect(controller.changePassword(user as any, dto, undefined)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'CURRENT_PASSWORD_INCORRECT' }),
      });
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('returns fresh tokens for the acting session after a successful change (S7)', async () => {
      const dto: ChangePasswordDTO = {
        currentPassword: 'CorrectPass123@',
        newPassword: 'NewSecurePass123@',
      };

      const result = await controller.changePassword(user as any, dto, undefined, "session-live", sessionContext());

      expect(mockAuthService.rotateCurrentSession).toHaveBeenCalledWith(user.id, 'session-live', {
        ip: '10.0.0.1',
        userAgent: 'agent A',
      });
      expect(result).toMatchObject({
        message: 'Password changed',
        sessionId: 'session-live',
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
    });

    it('returns only the message when the token carries no session id (legacy tokens, S7)', async () => {
      const dto: ChangePasswordDTO = {
        currentPassword: 'CorrectPass123@',
        newPassword: 'NewSecurePass123@',
      };

      const result = await controller.changePassword(user as any, dto, undefined, undefined, sessionContext());

      expect(result).toEqual({ message: 'Password changed' });
      expect(mockAuthService.rotateCurrentSession).not.toHaveBeenCalled();
    });
  });

  describe(`${UserProfileController.prototype.getProfile.name}`, () => {
    it('returns the avatar URL of the authenticated user (S4)', async () => {
      const withAvatar = Object.assign(new UserMock(), { avatarUrl: '/uploads/avatars/user-1.png' });

      const result = await controller.getProfile(withAvatar as any);

      expect(result).toMatchObject({ avatarUrl: '/uploads/avatars/user-1.png' });
    });
  });

  describe(`${UserProfileController.prototype.updateProfilePhoto.name}`, () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const NEW_URL = '/uploads/avatars/user-1-1700000000000.png';

    const requestWithPart = (part: unknown | undefined) => ({ file: jest.fn().mockResolvedValue(part) });

    beforeEach(() => {
      mockUserService.updateProfilePhoto.mockResolvedValue(
        Object.assign(new UserMock(), { avatarUrl: NEW_URL }),
      );
    });

    it('hands the uploaded file to the service and returns the served URL (S1, S4)', async () => {
      const part = { mimetype: 'image/png', toBuffer: jest.fn().mockResolvedValue(PNG) };

      const result = await controller.updateProfilePhoto(user as any, requestWithPart(part) as any);

      expect(mockUserService.updateProfilePhoto).toHaveBeenCalledWith(user.id, {
        buffer: PNG,
        size: PNG.length,
        mimetype: 'image/png',
        originalName: undefined,
      });
      expect(result).toEqual({ avatarUrl: NEW_URL });
    });

    it('propagates the typed rejection for a disallowed format (S2)', async () => {
      mockUserService.updateProfilePhoto.mockRejectedValueOnce(
        DomainError.fromKind('INVALID_PROFILE_PHOTO_FORMAT'),
      );
      const part = { mimetype: 'image/gif', toBuffer: jest.fn().mockResolvedValue(Buffer.from('GIF89a')) };

      await expect(
        controller.updateProfilePhoto(user as any, requestWithPart(part) as any),
      ).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'INVALID_PROFILE_PHOTO_FORMAT', statusCode: 400 }),
      });
    });

    it('rejects an oversized upload with PROFILE_PHOTO_TOO_LARGE without calling the service (S3)', async () => {
      const part = {
        mimetype: 'image/png',
        toBuffer: jest.fn().mockRejectedValue(
          Object.assign(new Error('limit exceeded'), { name: 'RequestFileTooLargeError' }),
        ),
      };

      await expect(
        controller.updateProfilePhoto(user as any, requestWithPart(part) as any),
      ).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'PROFILE_PHOTO_TOO_LARGE' }),
      });
      expect(mockUserService.updateProfilePhoto).not.toHaveBeenCalled();
    });

    it('rejects a non-multipart or empty upload without calling the service (S1)', async () => {
      await expect(
        controller.updateProfilePhoto(user as any, requestWithPart(undefined) as any),
      ).rejects.toBeInstanceOf(DomainError);
      expect(mockUserService.updateProfilePhoto).not.toHaveBeenCalled();
    });
  });

  describe(`${UserProfileController.prototype.requestEmailChangeCode.name}`, () => {
    it('should emit the code to the current address and keep it out of the HTTP response (S8, S10)', async () => {
      const result = await controller.requestEmailChangeCode(user as any, 'en');

      expect(mockUserService.requestEmailChangeCode).toHaveBeenCalledWith(user.id);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        EmailEvents.EMAIL_CHANGE_CODE_REQUESTED,
        expect.objectContaining({ email: user.email, code: '123456', lang: 'en' }),
      );
      expect(result).toEqual({ message: 'Password changed' });
      expect(JSON.stringify(result)).not.toContain('123456');
    });

    it('should propagate the throttle rejection without emitting anything (S11)', async () => {
      mockUserService.requestEmailChangeCode.mockRejectedValueOnce(DomainError.fromKind('VALIDATION_ERROR'));

      await expect(controller.requestEmailChangeCode(user as any, undefined)).rejects.toBeInstanceOf(DomainError);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe(`${UserProfileController.prototype.changeEmail.name}`, () => {
    it('should hand the code to the service and emit the confirmation to the new address (S1, S3)', async () => {
      const dto = { email: 'new@example.com', code: '123456' };

      const result = await controller.changeEmail(user as any, dto, undefined);

      expect(mockUserService.requestEmailChange).toHaveBeenCalledWith(user.id, dto);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        EmailEvents.EMAIL_CHANGE_REQUESTED,
        expect.objectContaining({ newEmail: 'new@example.com', pendingEmailToken: 'token' }),
      );
      expect(JSON.stringify(result)).not.toContain('123456');
    });

    it('should not emit a confirmation email when the code is rejected (S1)', async () => {
      mockUserService.requestEmailChange.mockRejectedValueOnce(DomainError.fromKind('INVALID_EMAIL_CHANGE_CODE'));

      await expect(
        controller.changeEmail(user as any, { email: 'new@example.com', code: '000000' }, undefined),
      ).rejects.toMatchObject({ kind: expect.objectContaining({ kind: 'INVALID_EMAIL_CHANGE_CODE' }) });
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});