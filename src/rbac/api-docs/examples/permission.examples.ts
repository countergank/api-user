import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

/** Request body of `POST /admin/permissions`. */
export class CreatePermissionRequest {
  @ApiProperty({ example: 'banner:manage', description: 'Nombre único del permiso en formato recurso:acción' })
  name: string;

  @ApiPropertyOptional({ example: 'Manage banners', description: 'Descripción del permiso' })
  description?: string;

  @ApiProperty({ example: 'user', description: 'Categoría del permiso', enum: ['user', 'system'] })
  category: string;
}

/** Request body of `PATCH /admin/permissions/:id`. */
export class UpdatePermissionRequest {
  @ApiPropertyOptional({ example: 'Rotated description', description: 'Nueva descripción del permiso' })
  description?: string;

  @ApiPropertyOptional({ example: 'system', description: 'Nueva categoría del permiso', enum: ['user', 'system'] })
  category?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Baja lógica: un permiso desactivado deja de poder asignarse, sin tocar los roles existentes',
  })
  isActive?: boolean;
}

/** Envelope of the admin permission write endpoints. */
export class PermissionMutationResponse {
  @ApiProperty({ type: PermissionResponse, description: 'Permiso afectado por la operación' })
  permission: PermissionResponse;
}
