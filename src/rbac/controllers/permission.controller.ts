import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionService } from '../../rbac/services/permission.service';
import { RoleService } from '../../rbac/services/role.service';

/**
 * Controller para gestión de permisos (RBAC).
 * Endpoint para listar permisos disponibles.
 * @public
 */
@ApiTags('rbac')
@Controller('permissions')
@ApiBearerAuth()
export class PermissionController {
  constructor(private permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Listar todos los permisos', 
    description: 'Retorna lista de todos los permisos disponibles en el sistema. Formato: recurso:acción' 
  })
  @ApiResponse({ status: 200, description: 'Lista de permisos' })
  async findAll() {
    const permissions = await this.permissionService.findAll();
    return { permissions };
  }
}
