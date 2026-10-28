import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para el inicio de sesión.
 * Sin reglas de fortaleza: la contraseña se valida contra el hash, no contra la política.
 * @example
 * {
 *   email: 'juan@example.com',
 *   password: 'SecurePass123!'
 * }
 */
export class LoginDTO {
  @ApiProperty({
    example: 'juan@example.com',
    description: 'Email del usuario',
    type: String,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Contraseña del usuario',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
