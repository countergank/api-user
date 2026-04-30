import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailRequest {
  @ApiProperty({ example: 'abc123-uuid-token', description: 'Token de verificación de email' })
  token: string;
}

export class VerifyEmailResponse {
  @ApiProperty({ example: 'Email verified successfully', description: 'Mensaje de confirmación' })
  message: string;
}

export class ConfirmEmailChangeRequest {
  @ApiProperty({ example: 'abc123-uuid-token', description: 'Token de confirmación de cambio de email' })
  token: string;
}

export class ConfirmEmailChangeResponse {
  @ApiProperty({ example: 'Email changed successfully', description: 'Mensaje de confirmación' })
  message: string;
}

export class ResendVerificationRequest {
  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  email: string;
}

export class ResendVerificationResponse {
  @ApiProperty({
    example: 'If the email exists, a verification link has been sent',
    description: 'Mensaje genérico (por seguridad)',
  })
  message: string;
}

export class ChangeEmailRequest {
  @ApiProperty({ example: 'newemail@example.com', description: 'Nuevo email para la cuenta' })
  email: string;
}

export class ChangeEmailResponse {
  @ApiProperty({
    example: 'Confirmation email sent to the new address',
    description: 'Mensaje de confirmación',
  })
  message: string;
}
