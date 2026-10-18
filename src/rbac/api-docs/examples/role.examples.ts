import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FindAllRolesResponse {
  @ApiProperty({ example: ['role_admin', 'role_user', 'role_guest'], description: 'Lista de roles' })
  roles: string[];
}

export class UpdateRolePermissionsRequest {
  @ApiProperty({
    type: [String],
    example: ['user:read', 'user:write'],
    description: 'Array de IDs de permisos con formato recurso:acción',
  })
  permissionIds: string[];
}

export class RoleExample {
  @ApiProperty({ example: '675b1f2c9a1e4a0012ab34cd', description: 'ID del rol' })
  _id: string;

  @ApiProperty({ example: 'moderator', description: 'Nombre único del rol' })
  name: string;

  @ApiProperty({ example: 'Moderates content', description: 'Descripción del rol', required: false })
  description: string;

  @ApiProperty({
    type: [String],
    example: ['user:read', 'user:update'],
    description: 'Permisos del rol; `*` representa todos los permisos',
  })
  permissionIds: string[];

  @ApiProperty({
    example: false,
    description: 'Rol de sistema: no puede renombrarse ni eliminarse',
  })
  isSystem: boolean;

  @ApiProperty({ example: false, description: 'Rol asignado por defecto a los usuarios nuevos' })
  isDefault: boolean;
}

export class RoleResponse {
  @ApiProperty({ type: RoleExample, description: 'Rol afectado por la operación' })
  role: RoleExample;
}

export class CreateRoleRequest {
  @ApiProperty({ example: 'moderator', description: 'Nombre único del rol' })
  name: string;

  @ApiPropertyOptional({ example: 'Moderates content', description: 'Descripción del rol' })
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['user:read', 'user:update'],
    description: 'Permisos del rol. Cada nombre debe existir en el catálogo; `*` es válido',
  })
  permissionIds?: string[];
}

export class UpdateRoleRequest {
  @ApiPropertyOptional({
    example: 'moderator',
    description: 'Nuevo nombre único del rol (los roles de sistema no pueden renombrarse)',
  })
  name?: string;

  @ApiPropertyOptional({ example: 'Moderates content', description: 'Nueva descripción del rol' })
  description?: string;
}

export class DeleteRoleResponse {
  @ApiProperty({ example: 'Role deleted', description: 'Mensaje de confirmación' })
  message: string;

  @ApiProperty({ example: '675b1f2c9a1e4a0012ab34cd', description: 'ID del rol eliminado' })
  roleId: string;
}
