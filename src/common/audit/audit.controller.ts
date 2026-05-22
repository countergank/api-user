import { Controller, Get, Inject, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { AuditService } from './audit.service';
import { AuditLogFilterDTO } from './dto/audit-log-filter.dto';
import { PaginatedAuditLogResponseDTO } from './dto/paginated-audit-log-response.dto';
import { AuditLogResponseDTO } from './dto/audit-log-response.dto';
import { I18nService } from '../../common/i18n/i18n.service';
import { getRequestLang } from '../../common/i18n/request-lang.helper';
import { ApplyAuditLogsDoc } from './api-docs/audit.decorator';

/**
 * Admin controller for querying audit logs.
 * All endpoints require JWT authentication with ADMIN role.
 * @public
 */
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, req: any): Promise<string> {
    return this.i18n.translate(key, getRequestLang(req));
  }

  @ApplyAuditLogsDoc()
  @Get()
  async findAuditLogs(
    @Query() filters: AuditLogFilterDTO,
    @Req() _req: any,
  ): Promise<PaginatedAuditLogResponseDTO> {
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

    return PaginatedAuditLogResponseDTO.of(data, result.total, filters.page ?? 1, filters.limit ?? 20);
  }
}
