import { ApiProperty } from '@nestjs/swagger';

export class EnrollTwoFactorRequest {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'No requerido: el endpoint se autentica con el Bearer token',
    required: false,
  })
  placeholder?: string;
}

export class EnrollTwoFactorResponse {
  @ApiProperty({
    example: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
    description: 'Secreto TOTP en base32. Se muestra una única vez: guárdalo antes de cerrar.',
  })
  secret: string;

  @ApiProperty({
    example:
      'otpauth://totp/api-user:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=api-user',
    description: 'URL otpauth:// para generar el QR de la app autenticadora',
  })
  otpauthUrl: string;
}

export class ActivateTwoFactorRequest {
  @ApiProperty({ example: '482913', description: 'Código TOTP de 6 dígitos' })
  code: string;
}

export class ActivateTwoFactorResponse {
  @ApiProperty({ example: true, description: 'Segundo factor habilitado' })
  twoFactorEnabled: boolean;
}

export class ChallengeTwoFactorRequest {
  @ApiProperty({
    example: '3q2-7_abc-def... (base64url, 43 caracteres)',
    description: 'Challenge token devuelto por POST /auth/login cuando el usuario tiene 2FA habilitado',
  })
  challengeToken: string;

  @ApiProperty({ example: '482913', description: 'Código TOTP de 6 dígitos' })
  code: string;
}

export class ChallengeTwoFactorResponse {
  @ApiProperty({ example: '5f8e...-session-id', description: 'Id estable de la sesión activa' })
  sessionId: string;

  @ApiProperty({
    example: {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      userName: 'user',
      name: 'User',
      lastName: 'Example',
    },
    description: 'Datos públicos del usuario autenticado',
  })
  user: object;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Token de acceso' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Refresh token' })
  refreshToken: string;
}
