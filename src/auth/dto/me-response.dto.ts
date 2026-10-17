import { ApiProperty } from '@nestjs/swagger';
import { User, UserRole } from '../../user/entities/user.entity';

/**
 * DTO de respuesta del usuario autenticado.
 * Expone una whitelist explícita de campos: nunca el documento completo.
 * @example
 * {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   name: 'Juan',
 *   lastName: 'Pérez',
 *   email: 'juan@example.com',
 *   role: 'user',
 *   permissions: ['user:read']
 * }
 */
export class MeResponseDTO {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID único del usuario',
  })
  id: string;

  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
  })
  name: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
  })
  lastName: string;

  @ApiProperty({
    example: 'juan@example.com',
    description: 'Email del usuario',
  })
  email: string;

  @ApiProperty({
    example: 'user',
    description: 'Rol del usuario (admin, user, viewer)',
    enum: UserRole,
    enumName: 'UserRole',
  })
  role: UserRole;

  @ApiProperty({
    example: ['user:read'],
    type: [String],
    description: 'Permisos efectivos del usuario (rol + permisos explícitos, sin duplicados)',
  })
  permissions: string[];

  constructor(user: User) {
    this.id = user.id;
    this.name = user.name;
    this.lastName = user.lastName;
    this.email = user.email;
    this.role = user.role;
    this.permissions = user.permissions;
  }

  static of(user: User): MeResponseDTO {
    return new MeResponseDTO(user);
  }
}
