import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

/**
 * Body del `POST /admin/users/:id/change-email`: el administrador sólo elige
 * la nueva dirección. La prueba de identidad no entra por acá — el link de
 * confirmación viaja al buzón nuevo y el flujo existente
 * `/auth/confirm-email-change` es el único que aplica el cambio.
 */
export class AdminRequestEmailChangeDTO {
  @ApiProperty({
    example: 'new-address@example.com',
    description: 'Nueva dirección de email; debe ser distinta de la actual y no estar en uso',
    type: String,
  })
  @IsEmail()
  email: string;
}
