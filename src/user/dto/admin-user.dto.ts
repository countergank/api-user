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
  'avatarUrl',
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

  @ApiProperty({
    example: '/uploads/avatars/507f1f77bcf86cd799439011-1700000000000.png',
    description:
      'URL pública de la foto de perfil, resuelta por el mismo driver que /auth/me (undefined si no tiene foto). Solo lectura.',
    required: false,
    nullable: true,
  })
  avatarUrl?: string;

  constructor(user: User, avatarUrl?: string) {
    super(user);
    this.lockedUntil = user.lockedUntil ? user.lockedUntil.toISOString() : null;
    this.failedLoginAttempts = user.failedLoginAttempts ?? 0;
    this.emailVerified = !user.emailVerificationToken;
    this.hasPendingEmailChange = Boolean(user.pendingEmailToken);
    this.hasPendingPasswordReset = Boolean(user.resetPasswordToken);
    // Resolved-only by design (issue #548): the raw stored object key never
    // leaks; callers that do not resolve (update, toggleActive) expose no
    // avatarUrl at all rather than an unusable key.
    this.avatarUrl = avatarUrl;
  }

  static of(user: User, avatarUrl?: string): AdminUserDTO {
    return new AdminUserDTO(user, avatarUrl);
  }
}
