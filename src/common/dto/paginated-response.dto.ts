import { ApiProperty } from '@nestjs/swagger';

/**
 * Envelope único de respuestas de colección (COU-260).
 * @example
 * {
 *   data: [...],
 *   total: 100,
 *   page: 1,
 *   limit: 20,
 *   totalPages: 5
 * }
 */
export class PaginatedResponseDTO<T = unknown> {
  @ApiProperty({ description: 'Array de resultados', isArray: true })
  data: T[];

  @ApiProperty({ example: 100, description: 'Total de registros del conjunto completo, no de la página' })
  total: number;

  @ApiProperty({ example: 1, description: 'Página actual' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items por página' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total de páginas' })
  totalPages: number;

  static of<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDTO<T> {
    const dto = new PaginatedResponseDTO<T>();
    dto.data = data;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    return dto;
  }
}
