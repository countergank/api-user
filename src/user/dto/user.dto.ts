import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../entities/user.entity';

/**
 * DTO de respuesta de usuario.
 * @example
 * {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Juan',
 *   lastName: 'Pérez',
 *   email: 'juan@example.com',
 *   userName: 'juanperez',
 *   role: 'user',
 *   createdAt: '2024-01-01T00:00:00.000Z',
 *   updatedAt: '2024-01-01T00:00:00.000Z'
 * }
 */
export class UserDTO {
  @ApiProperty({ 
    example: '123e4567-e89b-12d3-a456-426614174000', 
    description: 'ID único del usuario' 
  })
  id: string;

  @ApiProperty({ 
    example: 'Juan', 
    description: 'Nombre del usuario' 
  })
  name: string;

  @ApiProperty({ 
    example: 'Pérez', 
    description: 'Apellido del usuario' 
  })
  lastName: string;

  @ApiProperty({ 
    example: 'juan@example.com', 
    description: 'Email del usuario' 
  })
  email: string;

  @ApiProperty({ 
    example: 'juanperez', 
    description: 'Nombre de usuario' 
  })
  userName: string;

  @ApiProperty({ 
    example: 'user', 
    description: 'Rol del usuario (admin, user, viewer)',
    enum: UserRole,
    enumName: 'UserRole'
  })
  role: UserRole;

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

  @ApiProperty({ 
    example: true, 
    description: 'Indica si la cuenta está activa' 
  })
  isActive: boolean;

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.userName = user.userName;
    this.role = user.role;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.isActive = user.isActive;
  }

  static of(user: User): UserDTO {
    return new UserDTO(user);
  }
}
