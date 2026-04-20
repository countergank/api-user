import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents API version and metadata.
 * @example
 * {
 *   version: 'api-user v=1.0.0',
 *   name: 'API User',
 *   description: 'User management microservice',
 *   repository: 'https://github.com/countergank/api-user'
 * }
 */
export class Version {
  @ApiProperty({
    example: 'api-user v=1.0.0',
    description: 'Versión semver del proyecto',
  })
  version: string;

  @ApiProperty({
    example: 'API User',
    description: 'Nombre del proyecto',
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: 'https://github.com/countergank/api-user',
    description: 'URL del repositorio',
    required: false,
  })
  repository?: string;

  constructor(initializer: Record<string, unknown>) {
    Object.assign(this, initializer);
  }
}
