import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-facing view of a `Permission` (COU-260). It mirrors the fields the
 * endpoint actually returns, which is what the e2e asserts on `data[0]`.
 */
export class PermissionResponse {
  @ApiProperty({ example: 'user:read', description: 'Permiso en formato recurso:acción' })
  name: string;

  @ApiProperty({ example: 'Leer usuarios', description: 'Descripción traducida del permiso' })
  description: string;

  @ApiProperty({ example: 'user', description: 'Categoría del permiso', enum: ['user', 'system'] })
  category: string;

  @ApiProperty({ example: false, description: 'Permiso de sistema: no puede eliminarse' })
  isSystem: boolean;

  @ApiProperty({ example: true, description: 'Permiso activo' })
  isActive: boolean;
}
