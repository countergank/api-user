import { ApiProperty } from '@nestjs/swagger';

export class UploadProfilePhotoResponse {
  @ApiProperty({
    example: '/uploads/avatars/507f1f77bcf86cd799439011-1700000000000.png',
    description: 'URL pública servible de la foto de perfil',
  })
  avatarUrl: string;
}
