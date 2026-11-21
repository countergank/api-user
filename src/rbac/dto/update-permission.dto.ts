import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PermissionCategory } from '../entities/permission.entity';

/**
 * DTO para actualización de permisos (RBAC).
 * Sólo descripción, categoría y estado activo; `name` e `isSystem` no son
 * actualizables por API.
 *
 * @example
 * {
 *   description: 'Rotated description',
 *   category: 'system',
 *   isActive: false
 * }
 */
export class UpdatePermissionDTO {
  @ApiPropertyOptional({
    example: 'Rotated description',
    description: 'Nueva descripción del permiso',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: PermissionCategory.SYSTEM,
    description: 'Nueva categoría del permiso',
    enum: PermissionCategory,
  })
  @IsOptional()
  @IsEnum(PermissionCategory)
  category?: PermissionCategory;

  @ApiPropertyOptional({
    example: false,
    description: 'Baja lógica: un permiso desactivado deja de poder asignarse, sin tocar los roles existentes',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
