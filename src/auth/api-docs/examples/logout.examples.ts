import { ApiProperty } from '@nestjs/swagger';

export class LogoutRequest {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Refresh token de la sesión que se quiere cerrar',
  })
  refreshToken: string;
}

export class LogoutResponse {
  @ApiProperty({ example: 'Session closed successfully', description: 'Mensaje de confirmación' })
  message: string;
}

export class LogoutAllResponse {
  @ApiProperty({ example: 'All sessions have been closed', description: 'Mensaje de confirmación' })
  message: string;
}
