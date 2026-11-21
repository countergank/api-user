import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PermissionCategory } from '../entities/permission.entity';

/**
 * DTO para creación de permisos (RBAC).
 *
 * `isSystem` no forma parte del contrato: sólo el seeder define permisos de
 * sistema. Un `isSystem` enviado por el cliente es rechazado por el
 * `ValidationPipe` (`forbidNonWhitelisted`), no ignorado en silencio.
 *
 * @example
 * {
 *   name: 'banner:manage',
 *   description: 'Manage banners',
 *   category: 'user'
 * }
 */
export class CreatePermissionDTO {
  @ApiProperty({
    example: 'banner:manage',
    description: 'Nombre único del permiso en formato recurso:acción',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Manage banners',
    description: 'Descripción del permiso',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: PermissionCategory.USER,
    description: 'Categoría del permiso',
    enum: PermissionCategory,
  })
  @IsDefined()
  @IsEnum(PermissionCategory)
  category: PermissionCategory;
}
