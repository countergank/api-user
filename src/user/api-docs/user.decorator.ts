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
