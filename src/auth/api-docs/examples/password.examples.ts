import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordRequest {
  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  email: string;
}

export class ResetPasswordRequest {
  @ApiProperty({ example: 'abc123...', description: 'Token de recuperación' })
  token: string;

  @ApiProperty({ example: 'NewPass123!', description: 'Nueva contraseña' })
  newPassword: string;
}