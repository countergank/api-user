import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { GetProfileResponse } from './examples/get-profile.response';
import { UploadProfilePhotoResponse } from './examples/upload-photo.response';
import { UpdateProfileRequest } from './examples/update-profile.request';
import { ChangePasswordRequest, ChangePasswordResponse } from './examples/change-password.request';
import { ChangeEmailRequest, ChangeEmailResponse, RequestEmailChangeCodeResponse } from '../../auth/api-docs/examples/verification.examples';

export function ApplyGetProfileDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtener perfil del usuario actual',
      description: 'Retorna los datos públicos del usuario actualmente autenticado.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(GetProfileResponse),
    ApiResponse({
      status: 200,
      description: 'Perfil del usuario',
      schema: {
        $ref: getSchemaPath(GetProfileResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyUploadProfilePhotoDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cargar foto de perfil',
      description:
        'Recibe la foto del usuario autenticado (jpg/png/webp, hasta 2 MB) y retorna la URL pública servible del avatar.',
    }),
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiExtraModels(UploadProfilePhotoResponse),
    ApiResponse({
      status: 201,
      description: 'Foto almacenada',
      schema: {
        $ref: getSchemaPath(UploadProfilePhotoResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiBadRequestResponse({ description: 'Formato no soportado o archivo vacío', type: BadRequestDTO }),
    ApiResponse({ status: 413, description: 'Archivo por encima del límite de 2 MB' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: { type: 'string', format: 'binary' },
        },
        required: ['file'],
      },
    }),
  );
}

export function ApplyUpdateProfileDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Actualizar perfil del usuario',
      description: 'Actualiza el nombre y/o apellido del usuario actual.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(UpdateProfileRequest, GetProfileResponse),
    ApiResponse({
      status: 200,
      description: 'Perfil actualizado',
      schema: {
        $ref: getSchemaPath(GetProfileResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiBadRequestResponse({ description: 'Datos inválidos', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(UpdateProfileRequest),
      },
    }),
  );
}

export function ApplyChangePasswordDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cambiar contraseña',
      description:
        'Cambia la contraseña del usuario actual. Requiere la contraseña actual. Las demás sesiones se cierran al instante; la sesión que realiza el cambio sigue activa: si el access token lleva el id de sesión (sid), la respuesta incluye tokens frescos (sessionId/accessToken/refreshToken/user). Con tokens previos al claim (legacy) la sesión no puede rotarse y la respuesta contiene sólo `message`.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(ChangePasswordRequest, ChangePasswordResponse),
    ApiResponse({
      status: 200,
      description:
        'Contraseña cambiada exitosamente. Con sid en el token incluye el token par fresco de la sesión actual; con tokens legacy responde sólo `message`.',
      schema: {
        $ref: getSchemaPath(ChangePasswordResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Contraseña actual incorrecta', type: BadRequestDTO }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(ChangePasswordRequest),
      },
    }),
  );
}

export function ApplyChangeEmailDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Cambiar email',
      description:
        'Solicita el cambio de email con la prueba de identidad: el email no cambia todavía. Requiere el código de 6 dígitos enviado al email actual; un código ausente responde 400 y uno incorrecto, vencido o agotado responde 401. Al confirmar desde el email nuevo se aplica el cambio, se revocan las sesiones y se notifica a ambas direcciones.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(ChangeEmailRequest, ChangeEmailResponse),
    ApiResponse({
      status: 200,
      description: 'Email de confirmación enviado a la nueva dirección',
      schema: {
        $ref: getSchemaPath(ChangeEmailResponse),
      },
    }),
    ApiConflictResponse({ description: 'El email ya está en uso' }),
    ApiUnauthorizedResponse({ description: 'No autenticado o código de verificación inválido' }),
    ApiBadRequestResponse({ description: 'Datos inválidos o el email es el actual', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(ChangeEmailRequest),
      },
    }),
  );
}

export function ApplyRequestEmailChangeCodeDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Solicitar código de cambio de email',
      description:
        'Envía un código de 6 dígitos al email actual como prueba de identidad. Vale 10 minutos, admite 5 intentos, es de un solo uso y sólo puede reenviarse después de 60 segundos. El código nunca viaja en la respuesta.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(RequestEmailChangeCodeResponse),
    ApiResponse({
      status: 200,
      description: 'Código de verificación enviado al email actual',
      schema: {
        $ref: getSchemaPath(RequestEmailChangeCodeResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiBadRequestResponse({ description: 'Ya se envió un código hace menos de 60 segundos', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
