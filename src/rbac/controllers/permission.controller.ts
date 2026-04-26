import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionService } from '../../rbac/services/permission.service';
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
  constructor(private permissionService: PermissionService) {}

  @Get()
  @ApplyFindAllPermissionsDoc()
  async findAll() {
    const permissions = await this.permissionService.findAll();
    return { permissions };
  }
}
