import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';

/**
 * Parámetros de paginación para las colecciones que no tienen filtros propios
 * (COU-260). Reusa los mensajes i18n de validación `PAGE_MIN`, `LIMIT_MIN` y
 * `LIMIT_MAX` que ya existen para `PaginationQueryDTO`.
 *
 * @example
 * { page: 1, limit: 20 }
 */
export class CollectionPaginationQueryDTO {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página (1-indexed, mínimo 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'PAGE_MIN' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items por página (mínimo 1, máximo 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'LIMIT_MIN' })
  @Max(100, { message: 'LIMIT_MAX' })
  limit?: number = 20;
}
