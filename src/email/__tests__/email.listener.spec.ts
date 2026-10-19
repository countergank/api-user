import { Test, TestingModule } from '@nestjs/testing';
import { EmailListener } from '../listeners/email.listener';
import { EmailService } from '../service/email.service';
import { AppConfigService } from '../../config/app-config.service';

describe(EmailListener.name, () => {
  let listener: EmailListener;

  const mockEmailService = {
    sendBySlug: jest.fn().mockResolvedValue({ status: 'queued' }),
  };

  const mockConfigService = {
    get frontendUrl() {
      return 'https://app.example.com';
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailListener,
        { provide: EmailService, useValue: mockEmailService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    listener = module.get<EmailListener>(EmailListener);
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleUserRegistered', () => {
    it('should send welcome email with verification link using frontendUrl from AppConfigService', async () => {
      await listener.handleUserRegistered({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'John',
        verificationToken: 'abc123',
        lang: 'en',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'welcome',
        'user@example.com',
        {
          userName: 'John',
          verificationLink: 'https://app.example.com/verify?token=abc123',
        },
        'en',
      );
    });

    it('should use the exact frontendUrl value from AppConfigService, not process.env', async () => {
      const customConfig = {
        get frontendUrl() {
          return 'https://custom.domain.org';
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailListener,
          { provide: EmailService, useValue: mockEmailService },
          { provide: AppConfigService, useValue: customConfig },
        ],
      }).compile();

      const customListener = module.get<EmailListener>(EmailListener);

      await customListener.handleUserRegistered({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'John',
        verificationToken: 'token999',
        lang: 'en',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'welcome',
        'user@example.com',
        {
          userName: 'John',
          verificationLink: 'https://custom.domain.org/verify?token=token999',
        },
        'en',
      );
    });
  });

  describe('handleForgotPassword', () => {
    it('should send password reset email with reset link using frontendUrl from AppConfigService', async () => {
      await listener.handleForgotPassword({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'John',
        resetToken: 'reset456',
        lang: 'es',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'password-reset',
        'user@example.com',
        {
          userName: 'John',
          resetLink: 'https://app.example.com/reset-password?token=reset456',
        },
        'es',
      );
    });
  });

  describe('handleEmailChangeRequested', () => {
    it('should send email change confirmation with link using frontendUrl from AppConfigService', async () => {
      await listener.handleEmailChangeRequested({
        userId: 'user-1',
        newEmail: 'new@example.com',
        name: 'John',
        pendingEmailToken: 'token789',
        lang: 'en',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'email-change',
        'new@example.com',
        {
          userName: 'John',
          confirmationLink: 'https://app.example.com/confirm-email?token=token789',
        },
        'en',
      );
    });
  });

  describe('handleEmailChangeCodeRequested', () => {
    it('should send the six digit code to the address the account already has', async () => {
      await listener.handleEmailChangeCodeRequested({
        userId: 'user-1',
        email: 'current@example.com',
        name: 'John',
        code: '654321',
        expiresAt: new Date(),
        lang: 'en',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'email-change-code',
        'current@example.com',
        {
          userName: 'John',
          code: '654321',
        },
        'en',
      );
    });

    it('should never log the code when the delivery fails (S8)', async () => {
      const errorSpy = jest.spyOn(
        (listener as unknown as { logger: { error: (message: string) => void } }).logger,
        'error',
      );
      mockEmailService.sendBySlug.mockRejectedValueOnce(new Error('smtp down'));

      await listener.handleEmailChangeCodeRequested({
        userId: 'user-1',
        email: 'current@example.com',
        name: 'John',
        code: '654321',
        expiresAt: new Date(),
        lang: 'en',
      });

      const logged = errorSpy.mock.calls.map((call) => String(call[0])).join(' ');
      expect(logged).toContain('current@example.com');
      expect(logged).not.toContain('654321');
    });
  });

  describe('handleEmailChangeRequestedOld', () => {
    it('should send the revert link to the previous address (S12, S13)', async () => {
      await listener.handleEmailChangeRequestedOld({
        userId: 'user-1',
        previousEmail: 'old@example.com',
        newEmail: 'new@example.com',
        name: 'John',
        revertToken: 'revert123',
        lang: 'es',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'email-change-old-notice',
        'old@example.com',
        {
          userName: 'John',
          newEmail: 'new@example.com',
          revertLink: 'https://app.example.com/revert-email-change?token=revert123',
        },
        'es',
      );
    });
  });

  describe('handleEmailChangeReverted', () => {
    it('should notify the given address that the change was reverted', async () => {
      await listener.handleEmailChangeReverted({
        userId: 'user-1',
        email: 'old@example.com',
        name: 'John',
        lang: 'pt',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'email-change-reverted',
        'old@example.com',
        { userName: 'John' },
        'pt',
      );
    });
  });

  describe('handleResendVerification', () => {
    it('should resend verification email with link using frontendUrl from AppConfigService', async () => {
      await listener.handleResendVerification({
        userId: 'user-1',
        email: 'user@example.com',
        name: 'John',
        verificationToken: 'verify012',
        lang: 'en',
      });

      expect(mockEmailService.sendBySlug).toHaveBeenCalledWith(
        'welcome',
        'user@example.com',
        {
          userName: 'John',
          verificationLink: 'https://app.example.com/verify?token=verify012',
        },
        'en',
      );
    });
  });
});
