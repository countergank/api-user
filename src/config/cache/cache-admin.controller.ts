import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditAction } from '../../common/audit/audit.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { ApplyCacheStatsDoc } from './api-docs/cache-stats.decorator';
import { CacheStatsResponseDTO } from './dto/cache-stats.dto';
import { CacheService } from './cache.service';

@Controller('admin/cache')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CacheAdminController {
  constructor(private readonly cacheService: CacheService) {}

  @ApplyCacheStatsDoc()
  @Get('stats')
  @RequirePermissions('cache:read')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  @AuditAction({ action: 'cache.stats.view', resource: 'cache' })
  async stats(): Promise<CacheStatsResponseDTO> {
    return CacheStatsResponseDTO.of(await this.cacheService.stats());
  }
}
