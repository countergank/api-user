import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { OmitType } from '@nestjs/swagger';
import { CreateUserDTO } from './create-user.dto';
import { UserRole } from '../entities/user.entity';

/**
 * DTO para actualización de usuarios (admin).
 * Todos los campos son opcionales; solo se actualizan los enviados.
 * @example
 * {
 *   name: 'Juan Carlos',
 *   email: 'juancarlos@example.com'
 * }
 */
export class UpdateUserDTO extends PartialType(OmitType(CreateUserDTO, ['password'] as const)) {
  @ApiPropertyOptional({
    example: 'Juan Carlos',
    description: 'Nombre del usuario',
    type: String,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'Gómez',
    description: 'Apellido del usuario',
    type: String,
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'juancarlos@example.com',
    description: 'Email único del usuario',
    type: String,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'juancarlos',
    description: 'Nombre de usuario único',
    type: String,
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({
    example: 'admin',
    description: 'Rol del usuario (admin, user, viewer)',
    enum: UserRole,
    enumName: 'UserRole',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: ['users:read', 'users:write'],
    description: 'Permisos del usuario',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
