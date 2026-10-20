import { Body, Controller, Get, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { I18nService } from '../common/i18n/i18n.service';
import { AuditAction } from '../common/audit/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequestLang } from '../common/decorators/request-lang.decorator';
import { User } from '../user/entities/user.entity';
import {
  ApplyConfirmEmailChangeDoc,
  ApplyForgotPasswordDoc,
  ApplyLoginDoc,
  ApplyLogoutAllDoc,
  ApplyLogoutDoc,
  ApplyMeDoc,
  ApplyRefreshDoc,
  ApplyRegisterDoc,
  ApplyResendVerificationDoc,
  ApplyResetPasswordDoc,
  ApplyRevertEmailChangeDoc,
  ApplyVerifyEmailDoc,
} from './api-docs';
import { AuthService } from './auth.service';
import { MeResponseDTO } from './dto/me-response.dto';
import { RegisterUserDTO } from './dto/register-user.dto';
import { RevertEmailChangeDTO } from './dto/revert-email-change.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
    action: 'auth.register',
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
    action: 'auth.login',
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
  @HttpCode(200)
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
  @HttpCode(200)
  @ApplyVerifyEmailDoc()
  async verifyEmail(@Body() body: { token: string }, @RequestLang() lang: string | undefined) {
    await this.authService.verifyEmail(body.token);
    return { message: await this.t('messages.email_verified', lang) };
  }

  @Post('logout')
  @HttpCode(200)
  @ApplyLogoutDoc()
  @AuditAction({
    action: 'auth.logout',
    resource: 'auth',
    getBefore: () => ({ refreshToken: '[redacted]' }),
  })
  async logout(@Body() body: { refreshToken: string }, @RequestLang() lang: string | undefined) {
    await this.authService.logout(body.refreshToken);
    return { message: await this.t('messages.logged_out', lang) };
  }

  @Post('logout-all')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApplyLogoutAllDoc()
  @AuditAction({
    action: 'auth.logout-all',
    resource: 'auth',
    getResourceId: (_result, args) => (args[0] as User)?.id,
    getBefore: () => ({ sessions: 'all' }),
  })
  async logoutAll(@CurrentUser() user: User, @RequestLang() lang: string | undefined) {
    await this.authService.logoutAll(user.id);
    return { message: await this.t('messages.logged_out_all', lang) };
  }

  @Post('confirm-email-change')
  @HttpCode(200)
  @ApplyConfirmEmailChangeDoc()
  @AuditAction({
    action: 'auth.confirm-email-change',
    resource: 'auth',
    // S14: the confirmation is the write that applies the change, so it must be
    // audited here — the decorator on the service is inert for HTTP requests.
    // The token is the proof of identity and is never audited.
    getBefore: () => ({ emailChangeConfirmed: true }),
  })
  async confirmEmailChange(@Body() body: { token: string }, @RequestLang() lang: string | undefined) {
    await this.authService.confirmEmailChange(body.token, lang);
    return { message: await this.t('messages.email_changed', lang) };
  }

  @Post('revert-email-change')
  @HttpCode(200)
  @ApplyRevertEmailChangeDoc()
  @AuditAction({
    action: 'auth.revert-email-change',
    resource: 'auth',
    // The token is the proof of identity, so it is never audited.
    getBefore: () => ({ emailChangeReverted: true }),
  })
  async revertEmailChange(@Body() dto: RevertEmailChangeDTO, @RequestLang() lang: string | undefined) {
    // S17: no JWT guard — the token sent to the previous address is the proof.
    await this.authService.revertEmailChange(dto.token, lang);
    return { message: await this.t('messages.email_change_reverted', lang) };
  }

  @Post('resend-verification')
  @HttpCode(200)
  @ApplyResendVerificationDoc()
  async resendVerification(@Body() body: { email: string }, @RequestLang() lang: string | undefined) {
    const user = await this.authService.findUserByEmail(body.email);
    if (!user) {
      return { message: await this.t('messages.verification_resent', lang) };
    }

    await this.authService.resendVerification(user.id, user.email, user.name, lang);

    return { message: await this.t('messages.verification_resent', lang) };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApplyMeDoc()
  me(@CurrentUser() user: User): MeResponseDTO {
    return MeResponseDTO.of(user);
  }
}
