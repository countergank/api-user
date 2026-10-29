import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiExtraModels,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BadRequestDTO } from '../../../common/dto/bad-request.dto';
import { InternalErrorDTO } from '../../../common/dto/internal-error.dto';
import { PaginatedResponseDTO } from '../../../common/dto/paginated-response.dto';
import { paginatedSchema } from '../../../common/dto/paginated-response.schema';
import { ParameterEntryResponse } from './examples/parameter.examples';

const PAGINATION_NOTE =
  'Devuelve el envelope de colección `{ data, total, page, limit, totalPages }`. ' +
  'Acepta `page` (1-indexed, default 1) y `limit` (1-100, default 20). Un query param no declarado responde 400 (`forbidNonWhitelisted`).';

export function ApplyFindAllParametersDoc() {
  return applyDecorators(
    ApiTags('parameters'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Listar todos los parámetros',
      description: `Lista los parámetros registrados con su valor efectivo. ${PAGINATION_NOTE}`,
    }),
    ApiExtraModels(PaginatedResponseDTO, ParameterEntryResponse),
    ApiResponse({
      status: 200,
      description: 'Página de parámetros envuelta en el envelope de colección',
      schema: paginatedSchema(ParameterEntryResponse),
    }),
    ApiBadRequestResponse({ description: 'Página o límite inválido (PAGE_MIN / LIMIT_MIN / LIMIT_MAX)' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}

export function ApplyFindByGroupParametersDoc() {
  return applyDecorators(
    ApiTags('parameters'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Listar los parámetros de un grupo',
      description: `Lista los parámetros cuyo grupo coincide con el path. \`total\` cuenta el conjunto filtrado. ${PAGINATION_NOTE}`,
    }),
    ApiParam({ name: 'group', description: 'Grupo de parámetros', example: 'email' }),
    ApiExtraModels(PaginatedResponseDTO, ParameterEntryResponse),
    ApiResponse({
      status: 200,
      description: 'Página de parámetros del grupo envuelta en el envelope de colección',
      schema: paginatedSchema(ParameterEntryResponse),
    }),
    ApiBadRequestResponse({ description: 'Página o límite inválido (PAGE_MIN / LIMIT_MIN / LIMIT_MAX)' }),
    ApiInternalServerErrorResponse({ description: 'Internal Server Error', type: InternalErrorDTO }),
  );
}
