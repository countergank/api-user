import { ApiProperty } from '@nestjs/swagger';

export class PermissionExample {
  @ApiProperty({
    example: 'user:read',
    description: 'Permiso en formato recurso:acción',
  })
  permission: string;
}

export class FindAllPermissionsResponse {
  @ApiProperty({
    type: [PermissionExample],
    example: [
      { permission: 'user:read' },
      { permission: 'user:write' },
      { permission: 'user:delete' },
      { permission: 'role:read' },
    ],
    description: 'Lista de permisos disponibles',
  })
  permissions: { permission: string }[];
}