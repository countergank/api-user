import { ApiProperty } from '@nestjs/swagger';

export abstract class Message<T extends Record<string, any>> {
  @ApiProperty({ example: new Date() })
  timestamp: Date;

  abstract payload: T;

  constructor(partialData: Partial<Message<T>>) {
    Object.assign(this, partialData);
  }
}
