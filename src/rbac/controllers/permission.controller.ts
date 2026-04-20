import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionService } from '../../rbac/services/permission.service';
import { RoleService } from '../../rbac/services/role.service';

@ApiTags('rbac')
@Controller('permissions')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: 'List all permissions' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  async findAll() {
    const permissions = await this.permissionService.findAll();
    return { permissions };
  }
}
