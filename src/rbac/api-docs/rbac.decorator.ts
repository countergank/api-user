import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { FindAllRolesResponse, UpdateRolePermissionsRequest } from './examples/role.examples';
import { FindAllPermissionsResponse } from './examples/permission.examples';

export function ApplyFindAllRolesDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar todos los roles',
      description: 'Retorna lista de todos los roles disponibles en el sistema.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(FindAllRolesResponse),
    ApiResponse({
      status: 200,
      description: 'Lista de roles',
      schema: {
        $ref: getSchemaPath(FindAllRolesResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyUpdateRolePermissionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Asignar permisos a un rol',
      description: 'Actualiza los permisos de un rol específico.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'ID del rol',
      example: 'role_admin',
    }),
    ApiExtraModels(UpdateRolePermissionsRequest, FindAllRolesResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(UpdateRolePermissionsRequest),
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Rol actualizado',
      schema: {
        $ref: getSchemaPath(FindAllRolesResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyFindAllPermissionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar todos los permisos',
      description:
        'Retorna lista de todos los permisos disponibles en el sistema. Formato: recurso:acción',
    }),
    ApiBearerAuth(),
    ApiExtraModels(FindAllPermissionsResponse),
    ApiResponse({
      status: 200,
      description: 'Lista de permisos',
      schema: {
        $ref: getSchemaPath(FindAllPermissionsResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}