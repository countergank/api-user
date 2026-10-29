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
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { paginatedSchema } from '../../common/dto/paginated-response.schema';
import { CreateTemplateRequest, TemplateResponse, UpdateTemplateRequest } from './examples/template.examples';

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
      description:
        'Retorna los templates en el envelope de colección `{ data, total, page, limit, totalPages }`. ' +
        'Usar ?active=true para solo activos. Acepta `page` (1-indexed, default 1) y `limit` (1-100, default 20). Un query param no declarado responde 400 (`forbidNonWhitelisted`).',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'active',
      required: false,
      type: Boolean,
      description: 'Filtrar solo templates activos; `false` devuelve solo los inactivos y omitirlo devuelve todos',
    }),
    ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (1-indexed)', example: 1 }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (1-100)', example: 20 }),
    ApiExtraModels(TemplateResponse, PaginatedResponseDTO),
    ApiResponse({
      status: 200,
      description: 'Página de templates envuelta en el envelope de colección',
      schema: paginatedSchema(TemplateResponse),
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
