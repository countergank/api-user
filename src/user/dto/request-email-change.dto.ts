import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para solicitar el cambio de email con la prueba de identidad (S1, S10).
 *
 * `code` only carries `@IsNotEmpty()` / `@IsString()` on purpose: a code of the
 * wrong shape has to reach the service and fail as `401 INVALID_EMAIL_CHANGE_CODE`,
 * the same answer as an expired, spent or mismatching code. A format validator
 * here would turn it into a 400 and tell an attacker more than the service does.
 *
 * @example
 * {
 *   email: 'newemail@example.com',
 *   code: '123456'
 * }
 */
export class RequestEmailChangeDTO {
  @ApiProperty({
    example: 'newemail@example.com',
    description: 'Nuevo email para la cuenta (distinto del actual)',
    type: String,
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '123456',
    description: 'Código de 6 dígitos enviado al email actual',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  code: string;
}
