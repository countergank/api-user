import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CollectionPaginationQueryDTO } from '../../common/dto/collection-pagination-query.dto';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { UserRole } from '../../user/entities/user.entity';
import { ApplyFindAllParametersDoc, ApplyFindByGroupParametersDoc } from './api-docs/parameter.decorator';
import { UpdateParameterDto } from './dto/update-parameter.dto';
import { ParameterService } from './parameter.service';
import { ParameterEntry } from './parameter.types';

@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ParameterAdminController {
  constructor(private readonly parameterService: ParameterService) {}

  @ApplyFindAllParametersDoc()
  @Get()
  @RequirePermissions('parameter:read')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async findAll(@Query() query: CollectionPaginationQueryDTO): Promise<PaginatedResponseDTO<ParameterEntry>> {
    return this.parameterService.findPaginated({ page: query.page, limit: query.limit });
  }

  @ApplyFindByGroupParametersDoc()
  @Get(':group')
  @RequirePermissions('parameter:read')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async findByGroup(
    @Param('group') group: string,
    @Query() query: CollectionPaginationQueryDTO,
  ): Promise<PaginatedResponseDTO<ParameterEntry>> {
    return this.parameterService.findPaginated({ group, page: query.page, limit: query.limit });
  }

  @Put(':key')
  @RequirePermissions('parameter:update')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @AuditAction({ action: 'PARAMETER_UPDATE', resource: 'parameter' })
  async update(@Param('key') key: string, @Body() dto: UpdateParameterDto): Promise<ParameterEntry> {
    return this.parameterService.update(key, dto.value);
  }
}
