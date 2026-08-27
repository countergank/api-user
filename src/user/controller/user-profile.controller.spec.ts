import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../test-utils';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { EmailEvents } from '../../email/constants/email.events';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { UserMock } from '../mocks/user.mock';
import { UserService } from '../service/user.service';
import { UserProfileController } from './user-profile.controller';

describe(UserProfileController.name, () => {
  let controller: UserProfileController;
  let mockEventEmitter: { emit: jest.Mock };

  const user = new UserMock();

  const mockUserService = {
    update: jest.fn().mockResolvedValue(user),
    changePassword: jest.fn().mockResolvedValue(undefined),
    requestEmailChange: jest.fn().mockResolvedValue({ token: 'token', expires: new Date(), user }),
  };

  beforeEach(async () => {
    mockEventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
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
      mockUserService.changePassword.mockRejectedValue(DomainError.fromKind('CURRENT_PASSWORD_INCORRECT'));

      const dto: ChangePasswordDTO = {
        currentPassword: 'wrong',
        newPassword: 'NewSecurePass456@',
      };

      await expect(controller.changePassword(user as any, dto, undefined)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'CURRENT_PASSWORD_INCORRECT' }),
      });
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});