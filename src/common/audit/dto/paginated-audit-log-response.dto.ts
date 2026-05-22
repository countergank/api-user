import { ApiProperty } from '@nestjs/swagger';
import { AuditLogResponseDTO } from './audit-log-response.dto';

/**
 * Paginated response wrapper for audit log queries.
 */
export class PaginatedAuditLogResponseDTO {
  @ApiProperty({ type: [AuditLogResponseDTO], description: 'Array of audit log entries' })
  data: AuditLogResponseDTO[];

  @ApiProperty({ example: 100, description: 'Total number of records' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total number of pages' })
  totalPages: number;

  static of(
    data: AuditLogResponseDTO[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedAuditLogResponseDTO {
    const dto = new PaginatedAuditLogResponseDTO();
    dto.data = data;
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    return dto;
  }
}
