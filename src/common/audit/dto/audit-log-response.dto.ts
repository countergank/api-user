import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO for a single audit log entry.
 */
export class AuditLogResponseDTO {
  @ApiProperty({ example: '507f191e810c19729de860ea', description: 'Audit log ID' })
  id: string;

  @ApiProperty({ example: 'abc-123-def', description: 'Correlation ID for request tracing' })
  correlationId: string;

  @ApiPropertyOptional({ example: '507f191e810c19729de860ea', description: 'User ID who performed the action' })
  userId?: string;

  @ApiProperty({ example: 'user.create', description: 'Action performed' })
  action: string;

  @ApiProperty({ example: 'user', description: 'Resource type affected' })
  resource: string;

  @ApiPropertyOptional({ example: '507f191e810c19729de860ea', description: 'Specific resource ID' })
  resourceId?: string;

  @ApiPropertyOptional({ example: '192.168.1.1', description: 'IP address of the request' })
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...', description: 'User agent string' })
  userAgent?: string;

  @ApiPropertyOptional({ example: 'POST', description: 'HTTP method' })
  httpMethod?: string;

  @ApiPropertyOptional({ example: '/admin/users', description: 'API endpoint' })
  endpoint?: string;

  @ApiPropertyOptional({ example: 201, description: 'HTTP status code' })
  statusCode?: number;

  @ApiPropertyOptional({ example: 45, description: 'Request duration in milliseconds' })
  duration?: number;

  @ApiPropertyOptional({ description: 'Before/after state for mutations' })
  businessContext?: {
    before?: unknown;
    after?: unknown;
  };

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z', description: 'When the action occurred' })
  createdAt: Date;
}
