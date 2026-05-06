import { Controller, Get, UseGuards, Inject, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionService } from '../../rbac/services/permission.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { translateRbacItems } from '../../common/i18n/rbac-translate.helper';
import { getRequestLang } from '../../common/i18n/request-lang.helper';
import { ApplyFindAllPermissionsDoc } from '../api-docs';

/**
 * Controller para gestión de permisos (RBAC).
 * Endpoint para listar permisos disponibles.
 * @public
 */
@ApiTags('permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(
    private permissionService: PermissionService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  @Get()
  @ApplyFindAllPermissionsDoc()
  async findAll(@Req() req: any) {
    const permissions = await this.permissionService.findAll();
    return { permissions: await translateRbacItems(permissions, this.i18n, getRequestLang(req)) };
  }
}
