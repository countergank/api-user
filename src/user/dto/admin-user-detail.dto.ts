import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { AdminUserDTO } from './admin-user.dto';

/**
 * DTO de respuesta del detalle de usuario admin con los permisos efectivos
 * resueltos. Extiende `AdminUserDTO`: agrega el campo
 * `permissions` derivado del rol del usuario más sus permisos explícitos,
 * con la misma regla que `/auth/me` aplica para el usuario autenticado.
 *
 * Solo el detalle (`GET /admin/users/:id`) lo usa: las colecciones siguen
 * devolviendo `AdminUserDTO` sin resolver permisos por usuario.
 *
 * @example
 * {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   lockedUntil: null,
 *   failedLoginAttempts: 0,
 *   emailVerified: true,
 *   hasPendingEmailChange: false,
 *   hasPendingPasswordReset: false,
 *   permissions: ['user:read']
 * }
 */
export class AdminUserDetailDTO extends AdminUserDTO {
  @ApiProperty({
    example: ['user:read'],
    type: [String],
    description:
      'Permisos efectivos del usuario: permisos de su rol como base más los permisos explícitos, sin duplicados. Coherente con lo que /auth/me devolvería para este usuario. Un rol sin permisos devuelve [].',
  })
  permissions: string[];

  constructor(user: User, permissions: string[]) {
    super(user);
    this.permissions = permissions;
  }

  static of(user: User, permissions: string[] = []): AdminUserDetailDTO {
    return new AdminUserDetailDTO(user, permissions);
  }
}
