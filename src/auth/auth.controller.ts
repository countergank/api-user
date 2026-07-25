import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { I18nService } from '../common/i18n/i18n.service';
import { AuditAction } from '../common/audit/audit.decorator';
import { RequestLang } from '../common/decorators/request-lang.decorator';
import {
  ApplyConfirmEmailChangeDoc,
  ApplyForgotPasswordDoc,
  ApplyLoginDoc,
  ApplyRefreshDoc,
  ApplyRegisterDoc,
  ApplyResendVerificationDoc,
  ApplyResetPasswordDoc,
  ApplyVerifyEmailDoc,
} from './api-docs';
import { AuthService } from './auth.service';
import { RegisterUserDTO } from './dto/register-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, lang: string | undefined): Promise<string> {
    return this.i18n.translate(key, lang);
  }

  @Post('register')
  @ApplyRegisterDoc()
  @AuditAction({
    action: 'REGISTER',
    resource: 'auth',
    getResourceId: (result: any) => result?.user?.id,
  })
  async register(@Body() dto: RegisterUserDTO, @RequestLang() lang: string | undefined) {
    return this.authService.register(
      dto.email,
      dto.userName,
      dto.password,
      dto.name,
      dto.lastName,
      lang,
    );
  }

  @Post('login')
  @HttpCode(200)
  @ApplyLoginDoc()
  @AuditAction({
    action: 'LOGIN',
    resource: 'auth',
    getResourceId: (result: any) => result?.user?.id,
  })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApplyForgotPasswordDoc()
  async forgotPassword(@Body() body: { email: string }, @RequestLang() lang: string | undefined) {
    await this.authService.forgotPassword(body.email, lang);
    return { message: await this.t('messages.forgot_password_sent', lang) };
  }

  @Post('reset-password')
  @ApplyResetPasswordDoc()
  async resetPassword(@Body() body: { token: string; newPassword: string }, @RequestLang() lang: string | undefined) {
    await this.authService.resetPassword(body.token, body.newPassword, lang);
    return { message: await this.t('messages.password_reset_success', lang) };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApplyRefreshDoc()
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('verify-email')
  @ApplyVerifyEmailDoc()
  async verifyEmail(@Body() body: { token: string }, @RequestLang() lang: string | undefined) {
    await this.authService.verifyEmail(body.token);
    return { message: await this.t('messages.email_verified', lang) };
  }

  @Post('confirm-email-change')
  @ApplyConfirmEmailChangeDoc()
  async confirmEmailChange(@Body() body: { token: string }, @RequestLang() lang: string | undefined) {
    await this.authService.confirmEmailChange(body.token, lang);
    return { message: await this.t('messages.email_changed', lang) };
  }

  @Post('resend-verification')
  @ApplyResendVerificationDoc()
  async resendVerification(@Body() body: { email: string }, @RequestLang() lang: string | undefined) {
    const user = await this.authService.findUserByEmail(body.email);
    if (!user) {
      return { message: await this.t('messages.verification_resent', lang) };
    }

    await this.authService.resendVerification(user.id, user.email, user.name, lang);

    return { message: await this.t('messages.verification_resent', lang) };
  }
}
