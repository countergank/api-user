import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { PasswordStrength } from '../../common/decorators/password-strength.decorator';

/**
 * DTO para registro público de usuarios.
 * El rol se asigna por defecto como 'user' y no es editable desde el registro público.
 * @example
 * {
 *   name: 'Juan',
 *   lastName: 'Pérez',
 *   email: 'juan@example.com',
 *   userName: 'juanperez',
 *   password: 'SecurePass123!'
 * }
 */
export class RegisterUserDTO {
  @ApiProperty({ 
    example: 'Juan', 
    description: 'Nombre del usuario',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ 
    example: 'Pérez', 
    description: 'Apellido del usuario',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ 
    example: 'juan@example.com', 
    description: 'Email único del usuario',
    type: String 
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ 
    example: 'juanperez', 
    description: 'Nombre de usuario único',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({ 
    example: 'SecurePass123!', 
    description: 'Contraseña del usuario (mín. 8 caracteres, máx. 64)',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  @PasswordStrength()
  password: string;
}