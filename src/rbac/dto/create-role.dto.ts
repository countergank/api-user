import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO para creación de roles (RBAC).
 *
 * `isSystem` no forma parte del contrato: sólo el seeder define roles de
 * sistema. Un `isSystem` enviado por el cliente es rechazado por el
 * `ValidationPipe` (`forbidNonWhitelisted`), no ignorado en silencio.
 *
 * @example
 * {
 *   name: 'moderator',
 *   description: 'Moderates content',
 *   permissionIds: ['user:read', 'user:update']
 * }
 */
export class CreateRoleDTO {
  @ApiProperty({
    example: 'moderator',
    description: 'Nombre único del rol',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Moderates content',
    description: 'Descripción del rol',
    type: String,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['user:read', 'user:update'],
    description:
      'Permisos del rol (opcional). Cada nombre debe existir en el catálogo; `*` es válido. ' +
      'Los permisos también pueden asignarse luego con PUT /roles/:id/permissions.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds?: string[];
}
