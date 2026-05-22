import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsISO8601, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO for filtering audit log queries.
 * @example
 * {
 *   userId: '507f191e810c19729de860ea',
 *   action: 'user.create',
 *   resource: 'user',
 *   from: '2024-01-01T00:00:00.000Z',
 *   to: '2024-12-31T23:59:59.999Z',
 *   ipAddress: '192.168.1.1',
 *   page: 1,
 *   limit: 20
 * }
 */
export class AuditLogFilterDTO {
  @ApiPropertyOptional({
    example: '507f191e810c19729de860ea',
    description: 'Filter by user ID',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 'user.create',
    description: 'Filter by action name',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    example: 'user',
    description: 'Filter by resource type',
  })
  @IsOptional()
  @IsString()
  resource?: string;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Filter from date (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  from?: Date;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59.999Z',
    description: 'Filter to date (ISO 8601)',
  })
  @IsOptional()
  @IsISO8601()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  to?: Date;

  @ApiPropertyOptional({
    example: '192.168.1.1',
    description: 'Filter by IP address',
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-indexed, minimum 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'PAGE_MIN' })
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page (minimum 1, maximum 100)',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'LIMIT_MIN' })
  @Max(100, { message: 'LIMIT_MAX' })
  limit?: number = 20;
}
