import { Controller, Get, Put, Post, Patch, Delete, Param, Body, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { RoleService } from '../../rbac/services/role.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { translateRbacItems } from '../../common/i18n/rbac-translate.helper';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import {
  ApplyCreateRoleDoc,
  ApplyDeleteRoleDoc,
  ApplyFindAllRolesDoc,
  ApplyUpdateRoleDoc,
  ApplyUpdateRolePermissionsDoc,
} from '../api-docs';
import { DomainError } from '../../common/errors/domain.error';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CreateRoleDTO } from '../dto/create-role.dto';
import { UpdateRolePermissionsDTO } from '../dto/update-role-permissions.dto';
import { UpdateRoleDTO } from '../dto/update-role.dto';

/** Shape returned by the read endpoints after i18n translation. */
type TranslatedRole = Record<string, unknown> & { _id?: unknown; name?: string };

/**
 * Controller para gestión de roles (RBAC).
 * Endpoints para listar, crear, actualizar y eliminar roles, y para asignar permisos.
 * @public
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
export class RoleController {
  constructor(
    private roleService: RoleService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  @Get()
  @RequirePermissions('role:read')
  @ApplyFindAllRolesDoc()
  async findAll(@RequestLang() lang: string | undefined) {
    const roles = await this.roleService.findAll();
    return { roles: await translateRbacItems(roles, this.i18n, lang) };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @RequirePermissions('role:create')
  @AuditAction({
    action: 'role.create',
    resource: 'role',
    getResourceId: (result) => {
      const created = (result as { role?: TranslatedRole })?.role;
      return created?._id ? String(created._id) : '';
    },
    getAfter: (result) => ({ role: (result as { role?: TranslatedRole })?.role?.name }),
  })
  @ApplyCreateRoleDoc()
  async create(@Body() dto: CreateRoleDTO, @RequestLang() lang: string | undefined) {
    // `isSystem` is not part of the HTTP contract: only the seeder defines it.
    const role = await this.roleService.create({
      name: dto.name,
      description: dto.description,
      permissionIds: dto.permissionIds,
    });
    return { role: (await translateRbacItems([role], this.i18n, lang))[0] };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions('role:update')
  @AuditAction({
    action: 'role.update',
    resource: 'role',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => ({ roleId: args[0], changes: args[1] }),
    getAfter: (result) => {
      const updated = (result as { role?: TranslatedRole })?.role;
      return { roleId: updated?._id, name: updated?.name };
    },
  })
  @ApplyUpdateRoleDoc()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDTO,
    @RequestLang() lang: string | undefined,
  ) {
    const role = await this.roleService.update(id, dto);
    return { role: (await translateRbacItems([role], this.i18n, lang))[0] };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions('role:delete')
  @AuditAction({
    action: 'role.delete',
    resource: 'role',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => ({ roleId: args[0] }),
  })
  @ApplyDeleteRoleDoc()
  async remove(@Param('id') id: string, @RequestLang() lang: string | undefined) {
    await this.roleService.remove(id);
    return { message: await this.i18n.translate('messages.role_deleted', lang), roleId: id };
  }

  @Put(':id/permissions')
  @Roles(UserRole.ADMIN)
  @RequirePermissions('role:update')
  @ApplyUpdateRolePermissionsDoc()
  async updatePermissions(
    @Param('id') id: string,
    @Body() body: UpdateRolePermissionsDTO,
    @RequestLang() lang: string | undefined,
  ) {
    const role = await this.roleService.updatePermissions(id, body.permissionIds);
    if (!role) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }
    return { role: (await translateRbacItems([role], this.i18n, lang))[0] };
  }
}
