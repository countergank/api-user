import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditAction } from '../../common/audit/audit.decorator';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import { CollectionPaginationQueryDTO } from '../../common/dto/collection-pagination-query.dto';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { translateRbacItems } from '../../common/i18n/rbac-translate.helper';
import { RoleService } from '../../rbac/services/role.service';
import { UserRole } from '../../user/entities/user.entity';
import {
  ApplyCreateRoleDoc,
  ApplyDeleteRoleDoc,
  ApplyFindAllRolesDoc,
  ApplyUpdateRoleDoc,
  ApplyUpdateRolePermissionsDoc,
} from '../api-docs';
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
  async findAll(@RequestLang() lang: string | undefined, @Query() query: CollectionPaginationQueryDTO) {
    // COU-260: page the raw roles first, then translate only the page that is returned.
    const roles = await this.roleService.findAll();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;

    const data = await translateRbacItems(roles.slice(start, start + limit), this.i18n, lang);
    return PaginatedResponseDTO.of(data, roles.length, page, limit);
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
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDTO, @RequestLang() lang: string | undefined) {
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
