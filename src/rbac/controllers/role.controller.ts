import { Controller, Get, Put, Param, Body, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { RoleService } from '../../rbac/services/role.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { translateRbacItems } from '../../common/i18n/rbac-translate.helper';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import { ApplyFindAllRolesDoc, ApplyUpdateRolePermissionsDoc } from '../api-docs';

/**
 * Controller para gestión de roles (RBAC).
 * Endpoints para listar roles y asignar permisos.
 * @public
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoleController {
  constructor(
    private roleService: RoleService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  @Get()
  @ApplyFindAllRolesDoc()
  async findAll(@RequestLang() lang: string | undefined) {
    const roles = await this.roleService.findAll();
    return { roles: await translateRbacItems(roles, this.i18n, lang) };
  }

  @Put(':id/permissions')
  @Roles(UserRole.ADMIN)
  @ApplyUpdateRolePermissionsDoc()
  async updatePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }, @RequestLang() lang: string | undefined) {
    const role = await this.roleService.updatePermissions(id, body.permissionIds);
    return { role: (await translateRbacItems([role], this.i18n, lang))[0] };
  }
}
