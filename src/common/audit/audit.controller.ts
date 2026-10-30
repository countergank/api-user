import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { I18nService } from '../../common/i18n/i18n.service';
import { UserRole } from '../../user/entities/user.entity';
import { PaginatedResponseDTO } from '../dto/paginated-response.dto';
import { ApplyAuditLogsDoc } from './api-docs/audit.decorator';
import { AuditService } from './audit.service';
import { AuditLogFilterDTO } from './dto/audit-log-filter.dto';
import { AuditLogResponseDTO } from './dto/audit-log-response.dto';

/**
 * Admin controller for querying audit logs.
 * All endpoints require JWT authentication with ADMIN role.
 * @public
 */
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  @ApplyAuditLogsDoc()
  @RequirePermissions('audit:read')
  @Get()
  async findAuditLogs(@Query() filters: AuditLogFilterDTO): Promise<PaginatedResponseDTO<AuditLogResponseDTO>> {
    const result = await this.auditService.findPaginated({
      userId: filters.userId,
      action: filters.action,
      resource: filters.resource,
      from: filters.from,
      to: filters.to,
      ipAddress: filters.ipAddress,
      page: filters.page,
      limit: filters.limit,
    });

    const data = result.data.map((entry) => {
      const dto = new AuditLogResponseDTO();
      dto.id = (entry as any)._id?.toString() ?? (entry as any).id ?? '';
      dto.correlationId = entry.correlationId;
      dto.userId = entry.userId;
      dto.action = entry.action;
      dto.resource = entry.resource;
      dto.resourceId = entry.resourceId;
      dto.ipAddress = entry.ipAddress;
      dto.userAgent = entry.userAgent;
      dto.httpMethod = entry.httpMethod;
      dto.endpoint = entry.endpoint;
      dto.statusCode = entry.statusCode;
      dto.duration = entry.duration;
      dto.businessContext = entry.businessContext;
      dto.metadata = entry.metadata;
      dto.createdAt = (entry as any).createdAt ?? new Date();
      return dto;
    });

    return PaginatedResponseDTO.of(data, result.total, filters.page ?? 1, filters.limit ?? 20);
  }
}
