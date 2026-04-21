import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RoleService } from '../../rbac/services/role.service';

/**
 * Controller para gestión de roles (RBAC).
 * Endpoints para listar roles y asignar permisos.
 * @public
 */
@ApiTags('roles')
@Controller('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private roleService: RoleService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Listar todos los roles', 
    description: 'Retorna lista de todos los roles disponibles en el sistema.' 
  })
  @ApiResponse({ status: 200, description: 'Lista de roles' })
  async findAll() {
    const roles = await this.roleService.findAll();
    return { roles };
  }

  @Put(':id/permissions')
  @ApiOperation({ 
    summary: 'Asignar permisos a un rol', 
    description: 'Actualiza los permisos de un rol específico.' 
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID del rol', 
    example: 'role_admin' 
  })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['permissionIds'],
      properties: {
        permissionIds: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['user:read', 'user:write'],
          description: 'Array de IDs de permisos' 
        },
      },
    },
  })
  async updatePermissions(@Param('id') id: string, @Body() body: { permissionIds: string[] }) {
    const role = await this.roleService.updatePermissions(id, body.permissionIds);
    return { role };
  }
}
