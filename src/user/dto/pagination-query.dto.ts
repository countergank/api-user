import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const SORTABLE_FIELDS = ['name', 'lastName', 'email', 'userName', 'role', 'isActive', 'emailVerified', 'createdAt', 'updatedAt'];

/**
 * Sort spec a Mongo from the validated whitelist value (issue #541).
 *
 * The DTO whitelists `sortBy` with `@IsIn(SORTABLE_FIELDS)` at the HTTP
 * boundary; this function additionally coalesces any non-whitelisted value to
 * `createdAt` (review follow-up on #541), so a programmatic caller of the
 * repository can never sort on an arbitrary, non-existent field — the same
 * defensive fallback the baseline had.
 *
 * `emailVerified` is derived (`!emailVerificationToken`) and does not exist in
 * the stored documents: sorting directly by it is a silent no-op. It maps to
 * the token field with the same direction — MongoDB sorts missing values
 * before present ones, so `asc` lists verified users (no token) first and
 * `desc` lists unverified first. The tie-breaker is a fixed ascending `_id`
 * (creation order), so the order is stable across consecutive pages of the
 * same query in either direction.
 */
export function toMongoSort(sortBy: string, sortOrder: string): Record<string, 1 | -1> {
  const direction: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
  if (!SORTABLE_FIELDS.includes(sortBy)) {
    return { createdAt: direction, _id: 1 };
  }
  if (sortBy === 'emailVerified') {
    return { emailVerificationToken: direction, _id: 1 };
  }
  return { [sortBy]: direction, _id: 1 };
}

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
  @IsInt({ message: 'PAGE_INTEGER' })
  @Min(1, { message: 'PAGE_MIN' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items por página (mínimo 1, máximo 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'LIMIT_INTEGER' })
  @Min(1, { message: 'LIMIT_MIN' })
  @Max(100, { message: 'LIMIT_MAX' })
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Campo por el cual ordenar',
    default: 'createdAt',
    enum: SORTABLE_FIELDS,
  })
  @IsOptional()
  @IsIn(SORTABLE_FIELDS, { message: 'SORT_BY_INVALID' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Dirección de ordenamiento: asc o desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'SORT_ORDER_INVALID' })
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
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  @IsBoolean({ message: 'IS_ACTIVE_BOOLEAN' })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'juan',
    description: 'Búsqueda de texto en name, lastName, email, userName',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
