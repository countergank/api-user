import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ActivateTwoFactorDTO {
  @ApiProperty({
    example: '123456',
    description: 'Código TOTP de 6 dígitos generado por la app autenticadora',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
  code: string;
}
