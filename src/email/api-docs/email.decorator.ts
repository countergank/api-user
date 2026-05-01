import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import { SendEmailRequest, SendEmailResponse, SendDirectEmailRequest } from './examples/send-email.examples';

export function ApplySendEmailDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Enviar email por caso de uso',
      description:
        'Envía un email usando un template predefinido. Soporta variables dinámicas que se reemplazan en el template. Requiere rol admin.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(SendEmailRequest, SendEmailResponse),
    ApiResponse({
      status: 201,
      description: 'Email encolado para envío',
      schema: {
        $ref: getSchemaPath(SendEmailResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiBadRequestResponse({
      description: 'Template no encontrado o datos inválidos',
      type: BadRequestDTO,
    }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(SendEmailRequest),
      },
    }),
  );
}

export function ApplySendDirectEmailDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Enviar email directo (sin template)',
      description: 'Envía un email con contenido HTML personalizado sin usar un template. Requiere rol admin.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(SendDirectEmailRequest, SendEmailResponse),
    ApiResponse({
      status: 201,
      description: 'Email encolado para envío',
      schema: {
        $ref: getSchemaPath(SendEmailResponse),
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiBadRequestResponse({ description: 'Datos inválidos', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(SendDirectEmailRequest),
      },
    }),
  );
}
