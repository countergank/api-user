import { ApiProperty } from '@nestjs/swagger';

/**
 * Envelope de respuesta paginada genérico.
 * @example
 * {
 *   data: [...],
 *   total: 100,
 *   page: 1,
 *   limit: 20,
 *   totalPages: 5
 * }
 */
export class PaginatedUserResponseDTO<T = unknown> {
  @ApiProperty({ description: 'Array de resultados' })
  data: T[];

  @ApiProperty({ example: 100, description: 'Total de registros' })
  total: number;

  @ApiProperty({ example: 1, description: 'Página actual' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items por página' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total de páginas' })
  totalPages: number;

  static of<T>(data: T[], total: number, page: number, limit: number): PaginatedUserResponseDTO<T> {
    const dto = new PaginatedUserResponseDTO<T>();
    dto.data = data;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    return dto;
  }
}
