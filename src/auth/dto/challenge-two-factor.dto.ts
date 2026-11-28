import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChallengeTwoFactorDTO {
  @ApiProperty({
    example: '3q2+7/abc... (base64url, 43 chars)',
    description: 'Challenge token devuelto por POST /auth/login cuando el usuario tiene 2FA habilitado',
  })
  @IsString()
  challengeToken: string;

  @ApiProperty({
    example: '482913',
    description: 'Código TOTP de 6 dígitos generado por la app autenticadora',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;
}
