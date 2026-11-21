import { Body, Controller, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditAction } from '../../common/audit/audit.decorator';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import { I18nService } from '../../common/i18n/i18n.service';
import { translateRbacItems } from '../../common/i18n/rbac-translate.helper';
import { PermissionService } from '../services/permission.service';
import { UserRole } from '../../user/entities/user.entity';
import { ApplyCreatePermissionDoc, ApplyUpdatePermissionDoc } from '../api-docs';
import { CreatePermissionDTO } from '../dto/create-permission.dto';
import { UpdatePermissionDTO } from '../dto/update-permission.dto';

/** Shape returned by the write endpoints after i18n translation. */
type TranslatedPermission = Record<string, unknown> & { _id?: unknown; name?: string };

/**
 * Controller para la gestión administrativa de permisos (RBAC).
 * Endpoints de alta y edición, restringidos a administradores.
 * @public
 */
@ApiTags('permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
export class AdminPermissionController {
  constructor(
    private permissionService: PermissionService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions('permission:create')
  @AuditAction({
    action: 'permission.create',
    resource: 'permission',
    getResourceId: (result) => {
      const created = (result as { permission?: TranslatedPermission })?.permission;
      return created?._id ? String(created._id) : '';
    },
    getAfter: (result) => ({ name: (result as { permission?: TranslatedPermission })?.permission?.name }),
  })
  @ApplyCreatePermissionDoc()
  async create(@Body() dto: CreatePermissionDTO, @RequestLang() lang: string | undefined) {
    // `isSystem` is not part of the HTTP contract: only the seeder defines it.
    const permission = await this.permissionService.create({
      name: dto.name,
      description: dto.description,
      category: dto.category,
    });
    return { permission: (await translateRbacItems([permission], this.i18n, lang))[0] };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions('permission:update')
  @AuditAction({
    action: 'permission.update',
    resource: 'permission',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => ({ permissionId: args[0], changes: args[1] }),
    getAfter: (result) => {
      const updated = (result as { permission?: TranslatedPermission })?.permission;
      return updated ? { permissionId: updated._id, name: updated?.name } : undefined;
    },
  })
  @ApplyUpdatePermissionDoc()
  async update(@Param('id') id: string, @Body() dto: UpdatePermissionDTO, @RequestLang() lang: string | undefined) {
    const permission = await this.permissionService.update(id, dto);
    return { permission: (await translateRbacItems([permission], this.i18n, lang))[0] };
  }
}
