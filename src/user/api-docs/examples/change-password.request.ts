import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordRequest {
  @ApiProperty({ example: 'OldPass123!', description: 'Contraseña actual' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPass123!', description: 'Nueva contraseña' })
  newPassword: string;
}

export class ChangePasswordResponse {
  @ApiProperty({
    example: 'Password changed successfully',
    description: 'Mensaje de confirmación',
  })
  message: string;
}