import { ApiProperty } from '@nestjs/swagger';
import { ActiveSession } from '../entities/active-session.entity';

/**
 * DTO de sesión activa para el listado admin.
 *
 * Expone el `sessionId` estable como `id`; el `jti` del refresh token se
 * excluye deliberadamente: es el material que permite canjear el token.
 */
export class ActiveSessionDTO {
  @ApiProperty({
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    description: 'Identificador estable de la sesión; se mantiene entre refreshes y es el id a revocar.',
  })
  id: string;

  @ApiProperty({
    example: 'Mozilla/5.0 (X11; Linux x86_64)',
    nullable: true,
    type: String,
    description: 'User-Agent del dispositivo que abrió la sesión; null si no se registró.',
  })
  device: string | null;

  @ApiProperty({
    example: '10.0.0.1',
    nullable: true,
    type: String,
    description: 'IP desde la que se inició la sesión; null si no se registró.',
  })
  ip: string | null;

  @ApiProperty({ example: '2026-01-01T10:00:00.000Z', format: 'date-time' })
  issuedAt: string;

  @ApiProperty({ example: '2026-01-02T11:30:00.000Z', format: 'date-time' })
  lastAccessAt: string;

  @ApiProperty({ example: '2026-01-08T10:00:00.000Z', format: 'date-time' })
  expiresAt: string;

  constructor(session: ActiveSession) {
    this.id = session.sessionId;
    this.device = session.userAgent ?? null;
    this.ip = session.ip ?? null;
    this.issuedAt = session.issuedAt.toISOString();
    this.lastAccessAt = session.lastAccessAt.toISOString();
    this.expiresAt = session.expiresAt.toISOString();
  }

  static of(session: ActiveSession): ActiveSessionDTO {
    return new ActiveSessionDTO(session);
  }
}
