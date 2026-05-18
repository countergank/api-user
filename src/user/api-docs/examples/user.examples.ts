import { ApiProperty } from '@nestjs/swagger';

export class UserResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'ID del usuario' })
  id: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  lastName: string;

  @ApiProperty({ example: 'juan@example.com', description: 'Email del usuario' })
  email: string;

  @ApiProperty({ example: 'juanperez', description: 'Nombre de usuario' })
  userName: string;

  @ApiProperty({ example: 'user', enum: ['admin', 'user', 'viewer'], description: 'Rol del usuario' })
  role: string;

  @ApiProperty({ example: true, description: 'Usuario activo' })
  isActive: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de creación' })
  createdAt: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Fecha de actualización' })
  updatedAt: string;
}

export class UserListResponse {
  @ApiProperty({ type: [UserResponse], description: 'Lista de usuarios' })
  users: UserResponse[];
}

export class PaginatedUserResponse {
  @ApiProperty({ type: [UserResponse], description: 'Array de usuarios en la página actual' })
  data: UserResponse[];

  @ApiProperty({ example: 100, description: 'Total de registros' })
  total: number;

  @ApiProperty({ example: 1, description: 'Página actual' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items por página' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total de páginas' })
  totalPages: number;
}
