import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export const SORTABLE_FIELDS = ['name', 'lastName', 'email', 'userName', 'role', 'isActive', 'createdAt', 'updatedAt'];

/**
 * DTO para parámetros de paginación en queries.
 * @example
 * {
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc',
 *   role: 'admin',
 *   isActive: true,
 *   search: 'juan'
 * }
 */
export class PaginationQueryDTO {
  @ApiPropertyOptional({
    example: 1,
    description: 'Número de página (1-indexed, mínimo 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items por página (mínimo 1, máximo 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo por el cual ordenar',
    default: 'createdAt',
    enum: SORTABLE_FIELDS,
  })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Dirección de ordenamiento: asc o desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Filtrar por rol exacto',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado activo',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'juan',
    description: 'Búsqueda de texto en name, lastName, email, userName',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
