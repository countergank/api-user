import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO para envío de email por caso de uso.
 * @example
 * {
 *   useCase: "password-reset",
 *   to: "user@example.com",
 *   variables: { userName: "Juan", resetLink: "https://..." }
 * }
 */
export class SendEmailDto {
  @ApiProperty({
    example: 'password-reset',
    description: 'Slug del template a usar',
  })
  @IsNotEmpty()
  @IsString()
  useCase: string;

  @ApiProperty({ example: 'user@example.com', description: 'Destinatario' })
  @IsNotEmpty()
  @IsEmail()
  to: string;

  @ApiPropertyOptional({
    example: { userName: 'Juan', resetLink: 'https://...' },
    description: 'Variables para reemplazar en el template',
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}
