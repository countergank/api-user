import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmailLogResponse {
  @ApiProperty({ example: 'log123' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  recipient: string;

  @ApiPropertyOptional({ example: 'password-reset' })
  templateSlug?: string;

  @ApiProperty({ example: 'Recuperación de contraseña' })
  subject: string;

  @ApiProperty({ example: 'google' })
  provider: string;

  @ApiProperty({ example: 'sent', enum: ['pending', 'sent', 'failed'] })
  status: string;

  @ApiPropertyOptional({ example: '<message-id@mail.gmail.com>' })
  messageId?: string;

  @ApiPropertyOptional({ example: 'Connection timeout' })
  error?: string;

  @ApiProperty({ example: '2026-04-30T00:00:00.000Z' })
  createdAt: string;
}
