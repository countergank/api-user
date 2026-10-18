import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO para actualización de roles (RBAC).
 * Sólo nombre y descripción; los permisos siguen por `PUT /roles/:id/permissions`.
 * `isSystem` no es actualizable por API.
 *
 * @example
 * {
 *   name: 'moderator',
 *   description: 'Moderates content'
 * }
 */
export class UpdateRoleDTO {
  @ApiPropertyOptional({
    example: 'moderator',
    description: 'Nuevo nombre único del rol (los roles de sistema no pueden renombrarse)',
    type: String,
  })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Moderates content',
    description: 'Nueva descripción del rol',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
