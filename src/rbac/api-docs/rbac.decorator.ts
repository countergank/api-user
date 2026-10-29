import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { paginatedSchema } from '../../common/dto/paginated-response.schema';
import { PermissionResponse } from './examples/permission.examples';
import { RoleExample, RoleResponse, UpdateRolePermissionsRequest } from './examples/role.examples';
import { CreateRoleRequest, DeleteRoleResponse, UpdateRoleRequest } from './examples/role.examples';

export function ApplyFindAllRolesDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar todos los roles',
      description:
        'Retorna los roles disponibles en el envelope de colección `{ data, total, page, limit, totalPages }`. ' +
        'Acepta `page` (1-indexed, default 1) y `limit` (1-100, default 20).',
    }),
    ApiBearerAuth(),
    ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 20 }),
    ApiExtraModels(PaginatedResponseDTO, RoleExample),
    ApiResponse({
      status: 200,
      description: 'Página de roles envuelta en el envelope de colección',
      schema: paginatedSchema(RoleExample),
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
    ApiExtraModels(UpdateRolePermissionsRequest, RoleResponse),
    ApiBody({
      schema: {
        $ref: getSchemaPath(UpdateRolePermissionsRequest),
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Rol actualizado',
      schema: {
        $ref: getSchemaPath(RoleResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyCreateRoleDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Crear rol',
      description:
        'Crea un rol no-sistema con nombre único. Los `permissionIds` se validan contra el catálogo: `*` es válido, cualquier otro nombre inexistente se rechaza. Un nombre duplicado responde 409.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(CreateRoleRequest, RoleResponse),
    ApiBody({ schema: { $ref: getSchemaPath(CreateRoleRequest) } }),
    ApiResponse({
      status: 201,
      description: 'Rol creado',
      schema: { $ref: getSchemaPath(RoleResponse) },
    }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre (UA-COM-003)' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyUpdateRoleDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Actualizar rol',
      description:
        'Actualiza el nombre y/o la descripción de un rol. Los roles de sistema (`isSystem: true`) no pueden renombrarse. Un nombre que ya pertenece a otro rol responde 409.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'ID del rol',
      example: '675b1f2c9a1e4a0012ab34cd',
    }),
    ApiExtraModels(UpdateRoleRequest, RoleResponse),
    ApiBody({ schema: { $ref: getSchemaPath(UpdateRoleRequest) } }),
    ApiResponse({
      status: 200,
      description: 'Rol actualizado',
      schema: { $ref: getSchemaPath(RoleResponse) },
    }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin, o el rol es de sistema.' }),
    ApiResponse({ status: 404, description: 'Rol no encontrado (UA-COM-002)' }),
    ApiResponse({ status: 409, description: 'Ya existe un rol con ese nombre (UA-COM-003)' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyDeleteRoleDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Eliminar rol',
      description:
        'Elimina un rol no-sistema. Un rol de sistema responde 403 y un rol con usuarios asignados responde 409 (UA-RBAC-001). Los documentos de usuario no se modifican.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'ID del rol',
      example: '675b1f2c9a1e4a0012ab34cd',
    }),
    ApiExtraModels(DeleteRoleResponse),
    ApiResponse({
      status: 200,
      description: 'Rol eliminado',
      schema: { $ref: getSchemaPath(DeleteRoleResponse) },
    }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin, o el rol es de sistema.' }),
    ApiResponse({ status: 404, description: 'Rol no encontrado (UA-COM-002)' }),
    ApiResponse({ status: 409, description: 'El rol tiene usuarios asignados (UA-RBAC-001)' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyFindAllPermissionsDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar todos los permisos',
      description:
        'Retorna los permisos disponibles en el envelope de colección `{ data, total, page, limit, totalPages }`. ' +
        'Formato: recurso:acción. Acepta `page` (1-indexed, default 1) y `limit` (1-100, default 20).',
    }),
    ApiBearerAuth(),
    ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 20 }),
    ApiExtraModels(PaginatedResponseDTO, PermissionResponse),
    ApiResponse({
      status: 200,
      description: 'Página de permisos envuelta en el envelope de colección',
      schema: paginatedSchema(PermissionResponse),
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
