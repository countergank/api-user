import { ApiProperty } from '@nestjs/swagger';

export class LoginRequest {
  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', description: 'Contraseña del usuario' })
  password: string;
}

export class LoginResponse {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de acceso',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token',
  })
  refreshToken: string;
}

export class TwoFactorChallengeResponse {
  @ApiProperty({
    example: true,
    description: 'El login requiere un segundo factor: no se emiten tokens hasta completarlo',
  })
  twoFactorRequired: boolean;

  @ApiProperty({
    example: '3q2-7_abc-def... (base64url, 43 caracteres)',
    description: 'Challenge token de vida corta (5 min) para intercambiar en POST /auth/2fa/challenge',
  })
  challengeToken: string;
}
