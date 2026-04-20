import { Controller, Post, Body, UseGuards, Get, Patch, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

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
  @ApiOperation({ 
    summary: 'Registrar nuevo usuario', 
    description: 'Crea un nuevo usuario en el sistema. Retorna tokens de acceso y refresh.' 
  })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Email o nombre de usuario ya existe' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'userName', 'password', 'name', 'lastName'],
      properties: {
        email: { type: 'string', example: 'user@example.com', description: 'Email único del usuario' },
        userName: { type: 'string', example: 'username', description: 'Nombre de usuario único' },
        password: { type: 'string', example: 'SecurePass123!', description: 'Contraseña del usuario' },
        name: { type: 'string', example: 'Juan', description: 'Nombre del usuario' },
        lastName: { type: 'string', example: 'Pérez', description: 'Apellido del usuario' },
      },
    },
  })
  async register(@Body() body: { email: string; userName: string; password: string; name: string; lastName: string }) {
    return this.authService.register(body.email, body.userName, body.password, body.name, body.lastName);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Iniciar sesión', 
    description: 'Autentica un usuario y retorna tokens de acceso y refresh.' 
  })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'user@example.com', description: 'Email del usuario' },
        password: { type: 'string', example: 'SecurePass123!', description: 'Contraseña del usuario' },
      },
    },
  })
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('forgot-password')
  @ApiOperation({ 
    summary: 'Solicitar recuperación de contraseña', 
    description: 'Envía un email con link para resetear la contraseña.' 
  })
  @ApiResponse({ status: 200, description: 'Email de recuperación enviado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'user@example.com', description: 'Email del usuario' },
      },
    },
  })
  async forgotPassword(@Body() body: { email: string }) {
    await this.authService.forgotPassword(body.email);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Resetear contraseña', 
    description: 'Resetea la contraseña usando el token del email.' 
  })
  @ApiResponse({ status: 200, description: 'Contraseña reseteada exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'newPassword'],
      properties: {
        token: { type: 'string', example: 'abc123...', description: 'Token de recuperación' },
        newPassword: { type: 'string', example: 'NewPass123!', description: 'Nueva contraseña' },
      },
    },
  })
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { message: 'Password reset successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Refrescar token de acceso', 
    description: 'Usa el refresh token para obtener nuevos access y refresh tokens.' 
  })
  @ApiResponse({ status: 200, description: 'Tokens refrescados exitosamente' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string', example: 'eyJhbG...', description: 'Refresh token' },
      },
    },
  })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body.refreshToken);
  }
}
