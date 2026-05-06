import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
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
import { getRequestLang } from '../common/i18n/request-lang.helper';

/**
 * Controller para manejo de autenticación de usuarios.
 * Provee endpoints para registro, login, recuperación y refresh de tokens.
 * @public
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApplyRegisterDoc()
  async register(@Body() dto: RegisterUserDTO, @Req() req: any) {
    return this.authService.register(dto.email, dto.userName, dto.password, dto.name, dto.lastName, getRequestLang(req));
  }

  @Post('login')
  @HttpCode(200)
  @ApplyLoginDoc()
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApplyForgotPasswordDoc()
  async forgotPassword(@Body() body: { email: string }, @Req() req: any) {
    await this.authService.forgotPassword(body.email, getRequestLang(req));
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @ApplyResetPasswordDoc()
  async resetPassword(@Body() body: { token: string; newPassword: string }, @Req() req: any) {
    await this.authService.resetPassword(body.token, body.newPassword, getRequestLang(req));
    return { message: 'Password reset successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApplyRefreshDoc()
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('verify-email')
  @ApplyVerifyEmailDoc()
  async verifyEmail(@Body() body: { token: string }) {
    await this.authService.verifyEmail(body.token);
    return { message: 'Email verified successfully' };
  }

  @Post('confirm-email-change')
  @ApplyConfirmEmailChangeDoc()
  async confirmEmailChange(@Body() body: { token: string }, @Req() req: any) {
    await this.authService.confirmEmailChange(body.token, getRequestLang(req));
    return { message: 'Email changed successfully' };
  }

  @Post('resend-verification')
  @ApplyResendVerificationDoc()
  async resendVerification(@Body() body: { email: string }, @Req() req: any) {
    const user = await this.authService.findUserByEmail(body.email);
    if (!user) {
      return { message: 'If the email exists, a verification link has been sent' };
    }

    await this.authService.resendVerification(user.id, user.email, user.name, getRequestLang(req));

    return { message: 'If the email exists, a verification link has been sent' };
  }
}
