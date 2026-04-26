import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { RegisterRequest, RegisterResponse } from './examples/register.examples';
import { LoginRequest, LoginResponse } from './examples/login.examples';
import { ForgotPasswordRequest, ResetPasswordRequest } from './examples/password.examples';
import { RefreshRequest, RefreshResponse } from './examples/refresh.examples';

export function ApplyRegisterDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Registrar nuevo usuario',
      description: 'Crea un nuevo usuario en el sistema. Retorna tokens de acceso y refresh.',
    }),
    ApiExtraModels(RegisterRequest, RegisterResponse),
    ApiResponse({
      status: 201,
      description: 'Usuario registrado exitosamente',
      schema: {
        $ref: getSchemaPath(RegisterResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Email o nombre de usuario ya existe', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(RegisterRequest),
      },
    }),
  );
}

export function ApplyLoginDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Iniciar sesión',
      description: 'Autentica un usuario y retorna tokens de acceso y refresh.',
    }),
    ApiExtraModels(LoginRequest, LoginResponse),
    ApiResponse({
      status: 200,
      description: 'Login exitoso',
      schema: {
        $ref: getSchemaPath(LoginResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'Credenciales inválidas' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(LoginRequest),
      },
    }),
  );
}

export function ApplyForgotPasswordDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Solicitar recuperación de contraseña',
      description: 'Envía un email con link para resetear la contraseña.',
    }),
    ApiExtraModels(ForgotPasswordRequest),
    ApiResponse({
      status: 200,
      description: 'Email de recuperación enviado',
      schema: {
        example: { message: 'If the email exists, a reset link has been sent' },
      },
    }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(ForgotPasswordRequest),
      },
    }),
  );
}

export function ApplyResetPasswordDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Resetear contraseña',
      description: 'Resetea la contraseña usando el token del email.',
    }),
    ApiExtraModels(ResetPasswordRequest),
    ApiResponse({
      status: 200,
      description: 'Contraseña reseteada exitosamente',
      schema: {
        example: { message: 'Password reset successfully' },
      },
    }),
    ApiBadRequestResponse({ description: 'Token inválido o expirado', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(ResetPasswordRequest),
      },
    }),
  );
}

export function ApplyRefreshDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Refrescar token de acceso',
      description: 'Usa el refresh token para obtener nuevos access y refresh tokens.',
    }),
    ApiExtraModels(RefreshRequest, RefreshResponse),
    ApiResponse({
      status: 200,
      description: 'Tokens refrescados exitosamente',
      schema: {
        $ref: getSchemaPath(RefreshResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'Refresh token inválido' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(RefreshRequest),
      },
    }),
  );
}