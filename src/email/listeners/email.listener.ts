import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CustomLogger } from '../../common/logger';
import { EmailEvents } from '../constants/email.events';
import {
  EmailChangeConfirmedEvent,
  EmailChangeRequestedEvent,
  ForgotPasswordEvent,
  PasswordChangedEvent,
  ResendVerificationEvent,
  UserRegisteredEvent,
} from '../interfaces/email-events.interface';
import { EmailService } from '../service/email.service';

@Injectable()
export class EmailListener {
  private readonly logger = new CustomLogger(EmailListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent(EmailEvents.USER_REGISTERED)
  async handleUserRegistered(payload: UserRegisteredEvent): Promise<void> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${payload.verificationToken}`;
      await this.emailService.sendBySlug('welcome', payload.email, {
        userName: payload.name,
        verificationLink,
      }, payload.lang);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${payload.email}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EmailEvents.FORGOT_PASSWORD)
  async handleForgotPassword(payload: ForgotPasswordEvent): Promise<void> {
    try {
      Logger.log(`📨 Listener: payload.lang="${payload.lang}"`, EmailListener.name);
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${payload.resetToken}`;
      await this.emailService.sendBySlug('password-reset', payload.email, {
        userName: payload.name,
        resetLink,
      }, payload.lang);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${payload.email}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EmailEvents.PASSWORD_CHANGED)
  async handlePasswordChanged(payload: PasswordChangedEvent): Promise<void> {
    try {
      await this.emailService.sendBySlug('password-changed', payload.email, {
        userName: payload.name,
      }, payload.lang);
    } catch (error) {
      this.logger.error(`Failed to send password changed email to ${payload.email}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EmailEvents.EMAIL_CHANGE_REQUESTED)
  async handleEmailChangeRequested(payload: EmailChangeRequestedEvent): Promise<void> {
    try {
      const confirmationLink = `${process.env.FRONTEND_URL}/confirm-email?token=${payload.pendingEmailToken}`;
      await this.emailService.sendBySlug('email-change', payload.newEmail, {
        userName: payload.name,
        confirmationLink,
      }, payload.lang);
    } catch (error) {
      this.logger.error(`Failed to send email change confirmation to ${payload.newEmail}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EmailEvents.EMAIL_CHANGE_CONFIRMED)
  async handleEmailChangeConfirmed(payload: EmailChangeConfirmedEvent): Promise<void> {
    try {
      await this.emailService.sendBySlug('password-changed', payload.email, {
        userName: payload.name,
      }, payload.lang);
    } catch (error) {
      this.logger.error(`Failed to send email change notification to ${payload.email}: ${(error as Error).message}`);
    }
  }

  @OnEvent(EmailEvents.RESEND_VERIFICATION)
  async handleResendVerification(payload: ResendVerificationEvent): Promise<void> {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${payload.verificationToken}`;
      await this.emailService.sendBySlug('welcome', payload.email, {
        userName: payload.name,
        verificationLink,
      }, payload.lang);
    } catch (error) {
      this.logger.error(`Failed to resend verification email to ${payload.email}: ${(error as Error).message}`);
    }
  }
}
