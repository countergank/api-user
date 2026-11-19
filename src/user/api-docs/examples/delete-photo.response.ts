import { ApiProperty } from '@nestjs/swagger';

export class DeleteProfilePhotoResponse {
  @ApiProperty({ example: 'Juan', description: 'Nombre del usuario' })
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del usuario' })
  lastName: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  email: string;

  @ApiProperty({
    example: null,
    description: 'URL pública de la foto de perfil; null tras la eliminación',
    nullable: true,
  })
  avatarUrl: string | null;
}
