import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleService } from '../../rbac/services/role.service';
import { ApplyFindAllRolesDoc, ApplyUpdateRolePermissionsDoc } from '../api-docs';

/**
 * Controller para gestión de roles (RBAC).
 * Endpoints para listar roles y asignar permisos.
 * @public
 */
@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @ApplyFindAllRolesDoc()
  async findAll() {
    const roles = await this.roleService.findAll();
    return { roles };
  }

  @Put(':id/permissions')
  @ApplyUpdateRolePermissionsDoc()
  async updatePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    const role = await this.roleService.updatePermissions(id, body.permissionIds);
    return { role };
  }
}
