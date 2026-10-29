import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { UserDTO } from './user.dto';

/**
 * DTO de respuesta de usuario para handlers de administración (COU-346).
 *
 * Agrega el estado de bloqueo de la cuenta sobre los datos base de `UserDTO`.
 * Solo los handlers con `@Roles(UserRole.ADMIN)` devuelven este DTO; un handler
 * no-admin no puede exponer estos campos porque `UserDTO` no los declara.
 *
 * @example
 * {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   lockedUntil: null,
 *   failedLoginAttempts: 0
 * }
 */
export class AdminUserDTO extends UserDTO {
  @ApiProperty({
    example: null,
    nullable: true,
    type: String,
    format: 'date-time',
    description:
      'Fecha y hora en la que la cuenta se desbloquea sola; null si no está bloqueada. Solo lectura.',
  })
  lockedUntil: string | null;

  @ApiProperty({
    example: 0,
    description: 'Intentos de login fallidos acumulados desde el último acceso exitoso. Solo lectura.',
  })
  failedLoginAttempts: number;

  constructor(user: User) {
    super(user);
    this.lockedUntil = user.lockedUntil ? user.lockedUntil.toISOString() : null;
    this.failedLoginAttempts = user.failedLoginAttempts ?? 0;
  }

  static of(user: User): AdminUserDTO {
    return new AdminUserDTO(user);
  }
}
