import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { User } from '../entities/user.entity';

/**
 * DTO para creación de usuarios.
 * @example
 * {
 *   name: 'Juan',
 *   lastName: 'Pérez',
 *   email: 'juan@example.com',
 *   userName: 'juanperez',
 *   password: 'SecurePass123!'
 * }
 */
export class CreateUserDTO {
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
    description: 'Contraseña del usuario (mín. 8 caracteres)',
    type: String 
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  toEntity(): User {
    const user = new User();
    user.name = this.name;
    user.lastName = this.lastName;
    user.email = this.email;
    user.userName = this.userName;
    user.password = this.password;
    return user;
  }
}
