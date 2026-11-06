import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChangePasswordRequest {
  @ApiProperty({ example: 'OldPass123!', description: 'Contraseña actual' })
  currentPassword: string;

  @ApiProperty({ example: 'NewPass123!', description: 'Nueva contraseña' })
  newPassword: string;
}

/**
 * Respuesta aditiva: con tokens que llevan el id de sesión (`sid`) incluye el
 * par fresco de la sesión actual; con tokens previos al claim sólo `message`.
 */
export class ChangePasswordResponse {
  @ApiProperty({
    example: 'Password changed successfully',
    description: 'Mensaje de confirmación',
  })
  message: string;

  @ApiPropertyOptional({
    example: '4f1c7c8e-9d2a-4f61-9b3e-2f7f1a8b9c10',
    description:
      'Id estable de la sesión actual, sin cambios. Sólo presente si el access token usado lleva el id de sesión (sid); los tokens legacy reciben únicamente `message`.',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Access token fresco de la sesión actual, con la nueva `tv`. Sólo presente junto a `sessionId`.',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Refresh token nuevo (nuevo `jti`), con validez de 7 días. Sólo presente junto a `sessionId`.',
  })
  refreshToken?: string;

  @ApiPropertyOptional({
    example: { id: '60f1c7c8e9d2a4f61a9b3e2f', email: 'user@example.com', userName: 'user', name: 'User', lastName: 'Example' },
    description: 'Datos del usuario autenticado. Sólo presente junto a `sessionId`.',
  })
  user?: {
    id: string;
    email: string;
    userName: string;
    name: string;
    lastName: string;
  };
}
