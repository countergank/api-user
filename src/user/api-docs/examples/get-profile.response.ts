import { ApiProperty } from '@nestjs/swagger';

export class GetProfileResponse {
  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  lastName: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  email: string;

  @ApiProperty({
    example: '/uploads/avatars/507f1f77bcf86cd799439011-1700000000000.png',
    description: 'URL pública de la foto de perfil (undefined si nunca cargó una)',
    required: false,
    nullable: true,
  })
  avatarUrl?: string;
}
