import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiHideProperty,
  ApiParam,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { Version } from '../class/version.class';
import { Message } from '../../common/class/message.class';

export function GetVersionDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtener información de la API',
      description: 'Retorna la versión y metadata de la API.',
    }),
    ApiExtraModels(Version),
    ApiResponse({
      status: 200,
      description: 'Información de la API',
      schema: {
        $ref: getSchemaPath(Version),
      },
    }),
    ApiBadRequestResponse({ description: 'Versión no encontrada', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function PostMessageMicroserviceDoc() {
  return applyDecorators(
    ApiOperation({
      summary: '[HIDDEN] Enviar mensaje al microservice',
      description: 'Endpoint interno para comunicación con microservicios. No documentado.',
    }),
    ApiHideProperty(),
    ApiExtraModels(Message),
    ApiParam({
      name: 'message-pattern',
      description: 'Patrón del mensaje (ej: user-created, order-completed)',
      example: 'user-created',
    }),
    ApiResponse({
      status: 200,
      description: 'Mensaje procesado',
      schema: {
        $ref: getSchemaPath(Message),
      },
    }),
    ApiBadRequestResponse({ description: 'Patrón de mensaje inválido', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
