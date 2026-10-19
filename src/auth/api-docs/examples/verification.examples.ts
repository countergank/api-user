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

  @ApiProperty({ example: '123456', description: 'Código de 6 dígitos enviado al email actual' })
  code: string;
}

export class ChangeEmailResponse {
  @ApiProperty({
    example: 'Confirmation email sent to the new address',
    description: 'Mensaje de confirmación',
  })
  message: string;
}

export class RequestEmailChangeCodeResponse {
  @ApiProperty({
    example: 'Verification code sent to the current address',
    description: 'Mensaje de confirmación (el código nunca viaja en la respuesta)',
  })
  message: string;
}

export class RevertEmailChangeRequest {
  @ApiProperty({
    example: 'f1f1f1f1-0000-4444-8888-abcdefabcdef',
    description: 'Token de reversión enviado al email anterior',
  })
  token: string;
}

export class RevertEmailChangeResponse {
  @ApiProperty({ example: 'Email change reverted successfully', description: 'Mensaje de confirmación' })
  message: string;
}
