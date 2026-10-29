import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CollectionPaginationQueryDTO } from '../../common/dto/collection-pagination-query.dto';

/**
 * Query params of `GET /email/templates` (COU-260).
 *
 * `active` must be declared here, not read with `@Query('active')`: the global
 * `ValidationPipe` runs with `forbidNonWhitelisted`, so an undeclared query param
 * is rejected with 400 instead of reaching the handler.
 *
 * @example
 * { page: 1, limit: 20, active: true }
 */
export class ListTemplatesQueryDTO extends CollectionPaginationQueryDTO {
  @ApiPropertyOptional({
    example: true,
    description: 'Filtrar por estado activo; omitido devuelve todos los templates',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'IS_ACTIVE_BOOLEAN' })
  active?: boolean;
}
