import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

/**
 * DTO de respuesta al crear usuario.
 * @example
 * {
 *   name: 'Juan',
 *   lastName: 'Pérez',
 *   email: 'juan@example.com',
 *   userName: 'juanperez',
 *   createdAt: '2024-01-01T00:00:00.000Z',
 *   updatedAt: '2024-01-01T00:00:00.000Z'
 * }
 */
export class CreateUserResponseDTO {
  @ApiProperty({ 
    example: 'Juan', 
    description: 'Nombre del usuario creado' 
  })
  name: string;

  @ApiProperty({ 
    example: 'Pérez', 
    description: 'Apellido del usuario creado' 
  })
  lastName: string;

  @ApiProperty({ 
    example: 'juan@example.com', 
    description: 'Email del usuario creado' 
  })
  email: string;

  @ApiProperty({ 
    example: 'juanperez', 
    description: 'Nombre de usuario creado' 
  })
  userName: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Fecha de creación' 
  })
  createdAt: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Fecha de última actualización' 
  })
  updatedAt: string;

  constructor(user: User) {
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.userName = user.userName;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }

  static of(user: User): CreateUserResponseDTO {
    return new CreateUserResponseDTO(user);
  }
}
