import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ApplyRegisterDoc,
  ApplyLoginDoc,
  ApplyForgotPasswordDoc,
  ApplyResetPasswordDoc,
  ApplyRefreshDoc,
} from './api-docs';

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
  async register(
    @Body() body: {
      email: string;
      userName: string;
      password: string;
      name: string;
      lastName: string;
    },
  ) {
    return this.authService.register(
      body.email,
      body.userName,
      body.password,
      body.name,
      body.lastName,
    );
  }

  @Post('login')
  @HttpCode(200)
  @ApplyLoginDoc()
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  @ApplyForgotPasswordDoc()
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @ApplyResetPasswordDoc()
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApplyRefreshDoc()
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }
}