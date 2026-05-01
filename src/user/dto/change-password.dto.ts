import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { PasswordStrength } from '../../common/decorators/password-strength.decorator';

/**
 * DTO para cambio de contraseña.
 * @example
 * {
 *   currentPassword: 'OldPass123!',
 *   newPassword: 'NewSecurePass456@'
 * }
 */
export class ChangePasswordDTO {
  @ApiProperty({
    example: 'OldPass123!',
    description: 'Contraseña actual del usuario',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: 'NewSecurePass456@',
    description: 'Nueva contraseña (mín. 8 caracteres, máx. 64)',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  @PasswordStrength()
  newPassword: string;
}
