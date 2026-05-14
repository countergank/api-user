import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UserDTO } from '../dto/user.dto';
import { CREATE_USER_SWAGGER } from './create-user.api-body';
import { UserResponse, UserListResponse, PaginatedUserResponse } from './examples/user.examples';

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
      description: 'Busca un usuario por su ID. Solo accesible por administradores.',
    }),
    ApiExtraModels(UserResponse),
    ApiResponse({
      status: 200,
      description: 'Usuario encontrado',
      schema: {
        $ref: getSchemaPath(UserResponse),
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
        'Retorna lista de todos los usuarios. Solo accesible por administradores.\n\n**Pagination**: Include `page` query param to enable paginated response. Without `page`, returns plain `UserDTO[]`.\n\n**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiExtraModels(UserListResponse, PaginatedUserResponse),
    ApiResponse({
      status: 200,
      description: 'Lista de usuarios (plain array without page param, or paginated envelope with page param)',
      schema: {
        oneOf: [
          { $ref: getSchemaPath(UserListResponse) },
          { $ref: getSchemaPath(PaginatedUserResponse) },
        ],
      },
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
      description: 'Text search across name, lastName, email, userName',
      example: 'juan',
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
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
