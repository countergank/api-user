import { ApiProperty } from '@nestjs/swagger';

/**
 * Clase base para mensajes de microservice.
 */
export abstract class Message<T extends Record<string, any>> {
  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp del mensaje',
  })
  timestamp?: Date;

  /** Payload del mensaje */
  abstract payload: T;

  constructor(partialData: Partial<Message<T>>) {
    this.timestamp = partialData?.timestamp ?? new Date();
    Object.assign(this, partialData);
  }
}
