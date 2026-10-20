import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para revertir un cambio de email desde el link «no fui yo» (S5, S17).
 * El token es la prueba de identidad: el endpoint no lleva guard de JWT.
 */
export class RevertEmailChangeDTO {
  @ApiProperty({
    example: 'f1f1f1f1-0000-4444-8888-abcdefabcdef',
    description: 'Token de reversión enviado al email anterior',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  token: string;
}
