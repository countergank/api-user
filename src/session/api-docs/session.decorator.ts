import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { ActiveSessionDTO } from '../dto/active-session.dto';

/**
 * Documentación OpenAPI de los endpoints admin de sesiones activas.
 * Se declaran aquí y no en `user.decorator.ts` porque la fuente del contrato es
 * `SessionModule`; los handlers viven en el controller admin del UserModule.
 */
export function ListSessionsDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Listar sesiones activas de un usuario (Admin)',
      description:
        'Devuelve las sesiones activas del usuario con sus metadatos (dispositivo, IP, último acceso).\n\n' +
        '**i18n Support**: Use `Accept-Language` header (es, en, pt) to receive messages in your preferred language.',
    }),
    ApiExtraModels(ActiveSessionDTO),
    ApiResponse({
      status: 200,
      description: 'Sesiones activas del usuario',
      schema: {
        type: 'array',
        items: { $ref: getSchemaPath(ActiveSessionDTO) },
      },
    }),
    ApiResponse({ status: 404, description: 'Usuario no encontrado' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function RevokeSessionDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Revocar una sesión activa (Admin)',
      description:
        'Denylista el refresh token de la sesión indicada; el siguiente refresh falla con 401. Las demás sesiones del usuario siguen funcionando.',
    }),
    ApiResponse({
      status: 200,
      description: 'Sesión revocada',
      schema: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Session closed successfully' } },
      },
    }),
    ApiResponse({ status: 404, description: 'Usuario o sesión no encontrada' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function LogoutAllSessionsDoc() {
  return applyDecorators(
    ApiTags('users'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Cerrar todas las sesiones de un usuario (Admin)',
      description:
        'Incrementa la versión de sesión del usuario (`sessionEpoch`) y elimina sus registros de sesión: ' +
        'los access tokens previos y todos los refresh tokens dejan de funcionar al instante (401).',
    }),
    ApiResponse({
      status: 200,
      description: 'Todas las sesiones fueron revocadas',
      schema: {
        type: 'object',
        properties: { message: { type: 'string', example: 'All sessions have been closed' } },
      },
    }),
    ApiResponse({ status: 404, description: 'Usuario no encontrado' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
