import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../common/dto/internal-error.dto';
import {
  CreateTemplateRequest,
  TemplateResponse,
  UpdateTemplateRequest,
} from './examples/template.examples';

export function ApplyCreateTemplateDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Crear template de email',
      description: 'Crea un nuevo template con contenido HTML y variables dinámicas.',
    }),
    ApiBearerAuth(),
    ApiExtraModels(CreateTemplateRequest, TemplateResponse),
    ApiResponse({
      status: 201,
      description: 'Template creado exitosamente',
      schema: {
        $ref: getSchemaPath(TemplateResponse),
      },
    }),
    ApiConflictResponse({ description: 'El slug ya existe' }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiBadRequestResponse({ description: 'Datos inválidos', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(CreateTemplateRequest),
      },
    }),
  );
}

export function ApplyFindAllTemplatesDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Listar templates de email',
      description: 'Retorna todos los templates. Usar ?active=true para solo activos.',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'active',
      required: false,
      type: Boolean,
      description: 'Filtrar solo templates activos',
    }),
    ApiExtraModels(TemplateResponse),
    ApiResponse({
      status: 200,
      description: 'Lista de templates',
      schema: {
        type: 'array',
        items: {
          $ref: getSchemaPath(TemplateResponse),
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyFindTemplateBySlugDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Obtener template por slug',
      description: 'Retorna un template específico identificado por su slug.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'slug', description: 'Slug del template (kebab-case)' }),
    ApiExtraModels(TemplateResponse),
    ApiResponse({
      status: 200,
      description: 'Template encontrado',
      schema: {
        $ref: getSchemaPath(TemplateResponse),
      },
    }),
    ApiNotFoundResponse({ description: 'Template no encontrado' }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyUpdateTemplateDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Actualizar template',
      description: 'Actualiza parcialmente un template. El version se incrementa automáticamente.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'slug', description: 'Slug del template' }),
    ApiExtraModels(UpdateTemplateRequest, TemplateResponse),
    ApiResponse({
      status: 200,
      description: 'Template actualizado',
      schema: {
        $ref: getSchemaPath(TemplateResponse),
      },
    }),
    ApiNotFoundResponse({ description: 'Template no encontrado' }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiBadRequestResponse({ description: 'Datos inválidos', type: BadRequestDTO }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
    ApiBody({
      schema: {
        $ref: getSchemaPath(UpdateTemplateRequest),
      },
    }),
  );
}

export function ApplyDeleteTemplateDoc() {
  return applyDecorators(
    ApiOperation({
      summary: 'Eliminar template',
      description: 'Elimina permanentemente un template por su slug.',
    }),
    ApiBearerAuth(),
    ApiParam({ name: 'slug', description: 'Slug del template' }),
    ApiNoContentResponse({ description: 'Template eliminado' }),
    ApiNotFoundResponse({ description: 'Template no encontrado' }),
    ApiUnauthorizedResponse({ description: 'No autenticado' }),
    ApiForbiddenResponse({ description: 'Acceso denegado. Se requiere rol admin.' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
