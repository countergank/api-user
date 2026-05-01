import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { CREATE_USER_SWAGGER } from './create-user.api-body';
import { UserResponse, UserListResponse } from './examples/user.examples';

export function CreateUserDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Crear nuevo usuario (Admin)',
      description: 'Crea un nuevo usuario en el sistema. Solo accesible por administradores.',
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
      description: 'Retorna lista de todos los usuarios. Solo accesible por administradores.',
    }),
    ApiExtraModels(UserListResponse),
    ApiResponse({
      status: 200,
      description: 'Lista de usuarios',
      schema: {
        $ref: getSchemaPath(UserListResponse),
      },
    }),
    ApiBadRequestResponse({ description: 'Bad Request', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
