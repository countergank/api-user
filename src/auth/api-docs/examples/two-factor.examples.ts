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
