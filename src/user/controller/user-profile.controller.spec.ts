import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Mock } from '../../../test/helpers';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { EncodeService } from '../../encode/encode.service';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { UserMock } from '../mocks/user.mock';
import { UserService } from '../service/user.service';
import { UserProfileController } from './user-profile.controller';

describe(UserProfileController.name, () => {
  let controller: UserProfileController;

  const user = new UserMock();

  const mockUserService = {
    update: jest.fn().mockResolvedValue(user),
    requestEmailChange: jest.fn().mockResolvedValue({ token: 'token', expires: new Date(), user }),
  };

  const mockEncodeService = {
    compare: jest.fn(),
    hash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserProfileController],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: EncodeService, useValue: mockEncodeService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
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
    it('should throw DomainError when current password is incorrect', async () => {
      mockEncodeService.compare.mockReturnValue(false);

      const dto: ChangePasswordDTO = {
        currentPassword: 'wrong',
        newPassword: 'NewSecurePass456@',
      };

      await expect(controller.changePassword(user as any, dto, undefined)).rejects.toBeInstanceOf(DomainError);
      await expect(controller.changePassword(user as any, dto, undefined)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'CURRENT_PASSWORD_INCORRECT' }),
      });
    });

    it('should update password when current password matches', async () => {
      mockEncodeService.compare.mockReturnValue(true);
      mockUserService.update.mockResolvedValue(user);

      const dto: ChangePasswordDTO = {
        currentPassword: 'CorrectPass123@',
        newPassword: 'NewSecurePass123@',
      };

      const result = await controller.changePassword(user as any, dto, undefined);
      expect(mockUserService.update).toHaveBeenCalledWith(user.id, { password: dto.newPassword });
      expect(result).toEqual({ message: 'Password changed' });
    });
  });
});
