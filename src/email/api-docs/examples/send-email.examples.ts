import { ApiProperty } from '@nestjs/swagger';

export class SendEmailRequest {
  @ApiProperty({
    example: 'password-reset',
    description: 'Slug del template a usar',
  })
  useCase: string;

  @ApiProperty({ example: 'user@example.com', description: 'Destinatario' })
  to: string;

  @ApiProperty({
    example: { userName: 'Juan', resetLink: 'https://app.countergank.com/reset?token=xxx' },
    description: 'Variables para reemplazar en el template',
    required: false,
  })
  variables?: Record<string, string>;
}

export class SendEmailResponse {
  @ApiProperty({ example: 'queued', description: 'Estado del envío' })
  status: string;
}

export class SendDirectEmailRequest {
  @ApiProperty({ example: 'user@example.com', description: 'Destinatario' })
  to: string;

  @ApiProperty({ example: 'Notificación importante', description: 'Asunto del email' })
  subject: string;

  @ApiProperty({ example: '<p>Contenido HTML</p>', description: 'Cuerpo HTML del email' })
  html: string;

  @ApiProperty({ example: 'soporte@countergank.com', description: 'Remitente (override)', required: false })
  from?: string;

  @ApiProperty({ example: 'no-reply@countergank.com', description: 'Reply-To', required: false })
  replyTo?: string;
}
