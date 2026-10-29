import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-facing view of `ParameterEntry` (COU-260). The runtime type is a plain
 * interface, so the documented collection envelope needs a decorated class to
 * describe each item.
 */
export class ParameterEntryResponse {
  @ApiProperty({ example: 'EMAIL_FROM', description: 'Clave del parámetro' })
  key: string;

  @ApiProperty({ example: 'string', description: 'Tipo del valor', enum: ['string', 'number', 'boolean'] })
  type: string;

  @ApiProperty({ example: 'no-reply@example.com', description: 'Valor efectivo (override en runtime o default)' })
  value: string | number | boolean;

  @ApiProperty({ example: 'no-reply@example.com', description: 'Valor por defecto definido en el registro' })
  default: string | number | boolean;

  @ApiProperty({ example: 'email', description: 'Grupo al que pertenece el parámetro' })
  group: string;

  @ApiProperty({ example: 300, description: 'Tiempo de vida en caché, en segundos' })
  ttl: number;

  @ApiProperty({ example: false, description: 'true cuando el valor vigente difiere del default' })
  isOverridden: boolean;
}
