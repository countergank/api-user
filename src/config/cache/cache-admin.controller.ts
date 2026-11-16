import { Controller, Get, Logger, ServiceUnavailableException, UseGuards } from '@nestjs/common';
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

// TTL is in milliseconds (throttler v5).
const STATS_THROTTLE_LIMIT = 30;
const STATS_THROTTLE_TTL_MS = 60_000;

@Controller('admin/cache')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class CacheAdminController {
  private readonly logger = new Logger(CacheAdminController.name);

  constructor(private readonly cacheService: CacheService) {}

  @ApplyCacheStatsDoc()
  @Get('stats')
  @RequirePermissions('cache:read')
  @Throttle({ default: { limit: STATS_THROTTLE_LIMIT, ttl: STATS_THROTTLE_TTL_MS } })
  @AuditAction({ action: 'cache.stats.view', resource: 'cache' })
  async stats(): Promise<CacheStatsResponseDTO> {
    try {
      return CacheStatsResponseDTO.of(await this.cacheService.stats());
    } catch (error) {
      // A failed Redis read must surface as 503, never as zeros that mask an outage.
      this.logger.error(`Cache stats unavailable: ${(error as Error).message}`);
      throw new ServiceUnavailableException('Cache metrics unavailable');
    }
  }
}
