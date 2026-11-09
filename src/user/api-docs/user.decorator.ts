import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { paginatedSchema } from '../../common/dto/paginated-response.schema';
import { AdminUserDetailDTO } from '../dto/admin-user-detail.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UserMetricsResponseDTO } from '../dto/user-metrics.dto';
import { CREATE_USER_SWAGGER } from './create-user.api-body';
import { UserResponse } from './examples/user.examples';

export function CreateUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Crear nuevo usuario (Admin)',
      description:
        'Crea un nuevo usuario en el sistema. Solo accesible por administradores.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiExtraModels(CreateUserDTO, UserResponse),
    ApiResponse({
      status: 201,
      description: 'Usuario creado exitosamente',
      schema: {
        $ref: getSchemaPath(UserResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Email o username ya existe', type: BadRequestDTO }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody(CREATE_USER_SWAGGER),
  );
}

export function FindByIdUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Obtener usuario por ID (Admin)',
      description:
        'Busca un usuario por su ID e incluye sus permisos efectivos (rol + permisos explícitos, sin duplicados; issue #536). Solo accesible por administradores.',
    }),
    ApiExtraModels(AdminUserDetailDTO),
    ApiResponse({
      status: 200,
      description: 'Usuario encontrado con sus permisos efectivos',
      schema: {
        allOf: [
          { $ref: getSchemaPath(AdminUserDetailDTO) },
        ],
      },
    }),
    ApiResponse({ status: 404, description: 'Usuario no encontrado' }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function FindAllUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Listar todos los usuarios (Admin)',
      description:
        'Retorna lista de todos los usuarios. Solo accesible por administradores.\n\n**Pagination**: `page` (1-indexed, default 1) and `limit` (1-100, default 20). The response is always the collection envelope `{ data, total, page, limit, totalPages }`.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiExtraModels(PaginatedResponseDTO, UserResponse),
    ApiResponse({
      status: 200,
      description: 'Página de usuarios envuelta en el envelope de colección',
      schema: paginatedSchema(UserResponse),
    }),
    ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 20 }),
    ApiQuery({
      name: 'sortBy',
      required: false,
      type: String,
      description: 'Sort field',
      enum: ['name', 'lastName', 'email', 'userName', 'role', 'isActive', 'createdAt', 'updatedAt'],
      example: 'createdAt',
    }),
    ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'], example: 'desc' }),
    ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role', example: 'admin' }),
    ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description:
        'Text search across name, lastName, email and userName. A leading `@` also looks the term up' +
        ' as a userName without the `@` (console topbar: `@juan` finds `juan`), without narrowing the' +
        ' other fields, so `@example.com` still matches emails.',
      example: 'juan',
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ExportUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Exportar la lista de usuarios a CSV (Admin)',
      description:
        'Devuelve el conjunto completo de usuarios que matchea los mismos filtros que la lista ' +
        '(`search`, `role`, `isActive`); `page` y `limit` se ignoran. El cuerpo es CSV RFC 4180 ' +
        'con una primera fila de encabezados y las columnas del DTO de administración ' +
        '(sin `password` ni estado de sesión).',
    }),
    ApiProduces('text/csv'),
    ApiResponse({
      status: 200,
      description: 'Archivo CSV (`text/csv; charset=utf-8`, attachment `users.csv`)',
      content: {
        'text/csv': {
          schema: { type: 'string' },
          example:
            'id,name,lastName,email,userName,role,isActive,createdAt,updatedAt,lockedUntil,failedLoginAttempts\r\n' +
            'abc123,Ana,Gracia,ana@example.com,anag,user,true,2026-01-01T00:00:00.000Z,2026-01-01T00:00:00.000Z,,0',
        },
      },
    }),
    ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role', example: 'user' }),
    ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Same text search as the list (name, lastName, email, userName; leading `@` adds a userName lookup).',
      example: 'ana',
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function MetricsUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'KPIs globales de usuarios (Admin)',
      description:
        'Six global user counts for the console dashboard, computed in a single aggregation. ' +
        'Soft-deleted users are excluded from every count. `newLast30Days` and `newPrevious30Days` ' +
        'are two point-in-time window counts used to render the month-over-month delta; they are ' +
        'not a time series.',
    }),
    ApiExtraModels(UserMetricsResponseDTO),
    ApiResponse({
      status: 200,
      description: 'Conteos globales de usuarios',
      schema: {
        $ref: getSchemaPath(UserMetricsResponseDTO),
      },
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function UnlockUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Desbloquear cuenta de usuario (Admin)',
      description:
        'Resetea los intentos fallidos de login y desbloquea una cuenta bloqueada. Solo accesible por administradores.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiResponse({
      status: 200,
      description: 'Cuenta desbloqueada exitosamente',
      schema: {
        example: {
          message: 'Account unlocked',
          userId: '507f191e810c19729de860ea',
        },
      },
    }),
    ApiBadRequestResponse({ description: 'Usuario no encontrado', type: BadRequestDTO }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function UpdateUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Actualizar usuario (Admin)',
      description:
        'Actualiza parcialmente los datos de un usuario. Solo los campos enviados se modifican. Solo accesible por administradores.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiExtraModels(UpdateUserDTO, UserResponse),
    ApiResponse({
      status: 200,
      description: 'Usuario actualizado exitosamente',
      schema: {
        $ref: getSchemaPath(UserResponse),
      },
    }),
    ApiBadRequestResponse({
      description: 'Usuario no encontrado, email o username ya existe',
      type: BadRequestDTO,
    }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      type: UpdateUserDTO,
      description: 'Campos a actualizar (todos opcionales)',
    }),
  );
}

export function DeleteUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Eliminar usuario (Admin)',
      description:
        'Elimina un usuario de forma lógica (soft delete). El usuario queda inactivo y no puede autenticarse. Operación idempotente: si ya está eliminado, retorna éxito sin modificar. Solo accesible por administradores.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiResponse({
      status: 200,
      description: 'Usuario eliminado exitosamente',
      schema: {
        example: {
          message: 'User soft-deleted',
          userId: '507f191e810c19729de860ea',
        },
      },
    }),
    ApiBadRequestResponse({ description: 'Usuario no encontrado', type: BadRequestDTO }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ToggleActiveDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Activar/desactivar usuario (Admin)',
      description:
        'Cambia el estado activo/inactivo de un usuario. No se puede activar un usuario eliminado (soft delete). Solo accesible por administradores.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiExtraModels(UserResponse),
    ApiResponse({
      status: 200,
      description: 'Estado del usuario actualizado',
      schema: {
        $ref: getSchemaPath(UserResponse),
      },
    }),
    ApiBadRequestResponse({
      description: 'Usuario no encontrado o usuario ya eliminado',
      type: BadRequestDTO,
    }),
    ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
