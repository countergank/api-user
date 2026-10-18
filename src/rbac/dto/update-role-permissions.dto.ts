import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

/**
 * Body del `PUT /roles/:id/permissions`.
 *
 * `permissionIds` es obligatorio: sin este DTO un body vacío llegaba como
 * `undefined` y se interpretaba como "lista vacía", vaciando los permisos del rol.
 */
export class UpdateRolePermissionsDTO {
  @ApiProperty({
    example: ['user:read', 'audit:read'],
    description: 'Permisos del rol. Acepta el comodín `*`. Cada nombre debe existir en el catálogo.',
    type: [String],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds: string[];
}
