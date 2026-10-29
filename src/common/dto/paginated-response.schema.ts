import { Type } from '@nestjs/common';
import { getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDTO } from './paginated-response.dto';

/**
 * OpenAPI schema for the collection envelope with a typed `data` array.
 *
 * `PaginatedResponseDTO` is generic, so on its own Swagger can only describe
 * `data` as an array without an item type. Every documented collection endpoint
 * reuses this helper to override just `data` and keep a single envelope source
 * (COU-260). Callers must also register both models with `ApiExtraModels`.
 */
export function paginatedSchema(item: Type<unknown>): Record<string, unknown> {
  return {
    allOf: [
      { $ref: getSchemaPath(PaginatedResponseDTO) },
      {
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(item) } },
        },
      },
    ],
  };
}
