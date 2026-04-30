import { ApiProperty } from '@nestjs/swagger';

export class GetProfileResponse {
  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  lastName: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  email: string;
}
