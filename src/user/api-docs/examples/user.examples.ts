import { ApiProperty } from '@nestjs/swagger';
import { UserDTO } from '../../dto/user.dto';

/**
 * Swagger-facing view of an admin user response.
 *
 * It deliberately declares no properties of its own: the metadata comes from
 * `UserDTO`, so a description or example change in the DTO reaches the generated
 * document without editing this file (COU-319). Redeclaring them here is how the
 * two texts drifted apart in COU-261.
 */
export class UserResponse extends UserDTO {}

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
