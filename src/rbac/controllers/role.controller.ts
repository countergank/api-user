import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RoleService } from '../../rbac/services/role.service';

@ApiTags('roles')
@Controller('roles')
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  async findAll() {
    const roles = await this.roleService.findAll();
    return { roles };
  }

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Assign permissions to role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updatePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    const role = await this.roleService.updatePermissions(id, body.permissionIds);
    return { role };
  }
}
