import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { GetProfileResponse } from './examples/get-profile.response';
import { UpdateProfileRequest } from './examples/update-profile.request';
import { ChangePasswordRequest, ChangePasswordResponse } from './examples/change-password.request';

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
      description: 'Cambia la contraseña del usuario actual. Requiere la contraseña actual.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(ChangePasswordRequest, ChangePasswordResponse),
    ApiResponse({
      status: 200,
      description: 'Contraseña cambiada exitosamente',
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