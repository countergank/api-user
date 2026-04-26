import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileRequest {
  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  name?: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  lastName?: string;
}