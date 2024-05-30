import { ApiProperty } from '@nestjs/swagger';

export class Version {
  @ApiProperty({
    example: 'Microservice v=branch-1.0.0',
  })
  version: string;

  constructor(initializer: Record<string, unknown>) {
    Object.assign(this, initializer);
  }
}
