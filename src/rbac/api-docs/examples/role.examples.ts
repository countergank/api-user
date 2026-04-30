import { ApiProperty } from '@nestjs/swagger';

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
