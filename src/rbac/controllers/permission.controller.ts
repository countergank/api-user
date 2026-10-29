import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import { CollectionPaginationQueryDTO } from '../../common/dto/collection-pagination-query.dto';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { I18nService } from '../../common/i18n/i18n.service';
import { translateRbacItems } from '../../common/i18n/rbac-translate.helper';
import { PermissionService } from '../../rbac/services/permission.service';
import { ApplyFindAllPermissionsDoc } from '../api-docs';

/**
 * Controller para gestión de permisos (RBAC).
 * Endpoint para listar permisos disponibles.
 * @public
 */
@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PermissionController {
  constructor(
    private permissionService: PermissionService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  @Get()
  @RequirePermissions('permission:read')
  @ApplyFindAllPermissionsDoc()
  async findAll(@RequestLang() lang: string | undefined, @Query() query: CollectionPaginationQueryDTO) {
    // COU-260: page the raw catalog first, then translate only the page that is returned.
    const permissions = await this.permissionService.findAll();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;

    const data = await translateRbacItems(permissions.slice(start, start + limit), this.i18n, lang);
    return PaginatedResponseDTO.of(data, permissions.length, page, limit);
  }
}
