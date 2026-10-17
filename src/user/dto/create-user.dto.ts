import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { User, UserRole } from '../entities/user.entity';
import { PasswordStrength } from '../../common/decorators/password-strength.decorator';

/**
 * DTO para creación de usuarios.
 * @example
 * {
 *   name: 'Juan',
 *   lastName: 'Pérez',
 *   email: 'juan@example.com',
 *   userName: 'juanperez',
 *   password: 'SecurePass123!',
 *   role: 'user'
 * }
 */
export class CreateUserDTO {
  @ApiProperty({
    example: 'Juan',
    description: 'Nombre del usuario',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Apellido del usuario',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'juan@example.com',
    description: 'Email único del usuario',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'juanperez',
    description: 'Nombre de usuario único',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  userName: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Contraseña del usuario (mín. 8 caracteres, máx. 64)',
    type: String,
  })
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @PasswordStrength()
  password: string;

  @ApiProperty({
    example: 'user',
    description: 'Rol del usuario (admin, user, viewer). Default: user',
    enum: UserRole,
    enumName: 'UserRole',
    required: false,
    default: 'user',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({
    example: ['user:read', 'audit:read'],
    description:
      'Permisos explícitos del usuario (opcional). Cada nombre debe existir en el catálogo. ' +
      'Si se omite, el usuario hereda los permisos de su rol.',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions?: string[];

  toEntity(): User {
    const user = new User();
    user.name = this.name;
    user.lastName = this.lastName;
    user.email = this.email;
    user.userName = this.userName;
    user.password = this.password;
    user.role = this.role || UserRole.USER;
    user.permissions = this.permissions ?? [];
    return user;
  }
}
