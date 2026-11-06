import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';
import { UserDTO } from './user.dto';

/**
 * DTO de respuesta de usuario para handlers de administración (COU-346).
 *
 * Agrega el estado de bloqueo y el estado de cuenta de la cuenta sobre los datos base de `UserDTO`.
 * Solo los handlers con `@Roles(UserRole.ADMIN)` devuelven este DTO; un handler
 * no-admin no puede exponer estos campos porque `UserDTO` no los declara.
 *
 * @example
 * {
 *   id: '123e4567-e89b-12d3-a456-426614174000',
 *   lockedUntil: null,
 *   failedLoginAttempts: 0,
 *   emailVerified: true,
 *   hasPendingEmailChange: false,
 *   hasPendingPasswordReset: false
 * }
 */
/**
 * Column order for the admin users CSV export (issue #455); mirrors the DTO fields below.
 */
export const ADMIN_USER_CSV_HEADERS = [
  'id',
  'name',
  'lastName',
  'email',
  'userName',
  'role',
  'isActive',
  'createdAt',
  'updatedAt',
  'lockedUntil',
  'failedLoginAttempts',
] as const;

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

  @ApiProperty({
    example: true,
    description:
      'Indica si el email del usuario está verificado: true cuando no hay token de verificación pendiente. Solo lectura.',
  })
  emailVerified: boolean;

  @ApiProperty({
    example: false,
    description:
      'Indica si hay un cambio de email pendiente de confirmación. No expone el token ni el email nuevo. Solo lectura.',
  })
  hasPendingEmailChange: boolean;

  @ApiProperty({
    example: false,
    description:
      'Indica si hay un reset de contraseña pendiente de confirmación. No expone el token. Solo lectura.',
  })
  hasPendingPasswordReset: boolean;

  constructor(user: User) {
    super(user);
    this.lockedUntil = user.lockedUntil ? user.lockedUntil.toISOString() : null;
    this.failedLoginAttempts = user.failedLoginAttempts ?? 0;
    this.emailVerified = !user.emailVerificationToken;
    this.hasPendingEmailChange = Boolean(user.pendingEmailToken);
    this.hasPendingPasswordReset = Boolean(user.resetPasswordToken);
  }

  static of(user: User): AdminUserDTO {
    return new AdminUserDTO(user);
  }
}
