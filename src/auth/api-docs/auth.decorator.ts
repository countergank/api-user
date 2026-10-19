import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { MeResponseDTO } from '../dto/me-response.dto';
import { RegisterRequest, RegisterResponse } from './examples/register.examples';
import { LoginRequest, LoginResponse } from './examples/login.examples';
import { ForgotPasswordRequest, ResetPasswordRequest } from './examples/password.examples';
import { RefreshRequest, RefreshResponse } from './examples/refresh.examples';
import { LogoutRequest, LogoutResponse, LogoutAllResponse } from './examples/logout.examples';
import {
  VerifyEmailRequest,
  VerifyEmailResponse,
  ConfirmEmailChangeRequest,
  ConfirmEmailChangeResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
  RevertEmailChangeRequest,
  RevertEmailChangeResponse,
} from './examples/verification.examples';

const RateLimitResponse = {
  status: 429,
  description: 'Too many requests. Retry after the specified duration in the Retry-After header.',
  schema: {
    example: {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests. Please try again in 45 seconds.',
    },
  },
};

const AccountLockedResponse = {
  status: 423,
  description: 'Account is temporarily locked due to too many failed login attempts.',
  schema: {
    example: {
      statusCode: 423,
      error: 'Locked',
      message: 'Account is temporarily locked due to too many failed login attempts. Please try again later or contact support.',
    },
  },
};

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
    ApiResponse(RateLimitResponse),
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
    ApiResponse(AccountLockedResponse),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
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
    ApiResponse(RateLimitResponse),
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
    ApiResponse(RateLimitResponse),
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
    ApiResponse(RateLimitResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(RefreshRequest),
      },
    }),
  );
}

export function ApplyLogoutDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cerrar sesión',
      description:
        'Revoca el refresh token enviado en el body. No requiere access token, así que permite cerrar sesión aunque el access token haya vencido.',
    }),
    ApiExtraModels(LogoutRequest, LogoutResponse),
    ApiResponse({
      status: 200,
      description: 'Sesión cerrada exitosamente',
      schema: {
        $ref: getSchemaPath(LogoutResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'Refresh token inválido' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(LogoutRequest),
      },
    }),
  );
}

export function ApplyLogoutAllDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cerrar todas las sesiones',
      description: 'Revoca todos los refresh tokens del usuario autenticado.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(LogoutAllResponse),
    ApiResponse({
      status: 200,
      description: 'Todas las sesiones fueron cerradas',
      schema: {
        $ref: getSchemaPath(LogoutAllResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado o token inválido' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
  );
}

export function ApplyVerifyEmailDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verificar email',
      description: 'Activa la cuenta del usuario usando el token recibido por email.',
    }),
    ApiExtraModels(VerifyEmailRequest, VerifyEmailResponse),
    ApiResponse({
      status: 200,
      description: 'Email verificado exitosamente',
      schema: {
        $ref: getSchemaPath(VerifyEmailResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Token inválido o expirado', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(VerifyEmailRequest),
      },
    }),
  );
}

export function ApplyConfirmEmailChangeDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Confirmar cambio de email',
      description: 'Confirma el cambio de email usando el token recibido en el nuevo email.',
    }),
    ApiExtraModels(ConfirmEmailChangeRequest, ConfirmEmailChangeResponse),
    ApiResponse({
      status: 200,
      description: 'Email cambiado exitosamente',
      schema: {
        $ref: getSchemaPath(ConfirmEmailChangeResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Token inválido o expirado', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(ConfirmEmailChangeRequest),
      },
    }),
  );
}

export function ApplyResendVerificationDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Reenviar email de verificación',
      description: 'Reenvía el link de verificación al email del usuario. No revela si el email existe.',
    }),
    ApiExtraModels(ResendVerificationRequest, ResendVerificationResponse),
    ApiResponse({
      status: 200,
      description: 'Link de verificación reenviado',
      schema: {
        $ref: getSchemaPath(ResendVerificationResponse),
      },
    }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(ResendVerificationRequest),
      },
    }),
  );
}

export function ApplyRevertEmailChangeDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Revertir cambio de email',
      description:
        'Revierte el cambio de email usando el token enviado al email anterior. No requiere access token: el token es la prueba de identidad. Dentro de las 72 h revierte el cambio y revoca las sesiones; fuera de la ventana responde 410. Repetir la llamada con el mismo token es idempotente (200).',
    }),
    ApiExtraModels(RevertEmailChangeRequest, RevertEmailChangeResponse),
    ApiResponse({
      status: 200,
      description: 'Cambio de email revertido (o ya revertido previamente)',
      schema: {
        $ref: getSchemaPath(RevertEmailChangeResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Token ausente o inválido', type: BadRequestDTO }),
    ApiUnauthorizedResponse({ description: 'Token de reversión desconocido' }),
    ApiResponse({ status: 410, description: 'La ventana de reversión de 72 h expiró' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(RevertEmailChangeRequest),
      },
    }),
  );
}

export function ApplyMeDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtener usuario autenticado',
      description: 'Retorna el rol y los permisos efectivos del usuario autenticado.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(MeResponseDTO),
    ApiResponse({
      status: 200,
      description: 'Datos del usuario autenticado con su rol y permisos efectivos',
      schema: {
        $ref: getSchemaPath(MeResponseDTO),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado o token inválido' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiResponse(RateLimitResponse),
  );
}
