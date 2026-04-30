import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO para envío directo de email (sin template).
 */
export class SendDirectEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Destinatario' })
  @IsNotEmpty()
  @IsEmail()
  to: string;

  @ApiProperty({ example: 'Notificación importante', description: 'Asunto' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ example: '<p>Contenido HTML</p>', description: 'Cuerpo HTML' })
  @IsNotEmpty()
  @IsString()
  html: string;

  @ApiPropertyOptional({ example: 'soporte@countergank.com', description: 'Remitente (override)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: 'no-reply@countergank.com', description: 'Reply-To' })
  @IsOptional()
  @IsString()
  replyTo?: string;

  @ApiPropertyOptional({
    example: { userId: '123', action: 'security-alert' },
    description: 'Metadata para auditoría',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
