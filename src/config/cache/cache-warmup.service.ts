import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PermissionService } from '../../rbac/services/permission.service';
import { RoleService } from '../../rbac/services/role.service';
import { EmailTemplateService } from '../../email/service/email-template.service';

@Injectable()
export class CacheWarmupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CacheWarmupService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
    private readonly roleService: RoleService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled = this.configService.get<string>('CACHE_WARMUP_ENABLED', 'true') === 'true';
    if (!enabled) {
      this.logger.log('Cache warm-up skipped (CACHE_WARMUP_ENABLED=false)');
      return;
    }

    const startedAt = Date.now();
    await this.warm('permissions', () => this.permissionService.findAll());
    await this.warm('roles', () => this.roleService.findAll());
    await this.warm('templates', () => this.emailTemplateService.warmCache());
    this.logger.log(`Cache warm-up finished in ${Date.now() - startedAt}ms`);
  }

  /**
   * A failed step is logged and skipped so a warm-up error can never
   * block application bootstrap; the caches fill on demand as before.
   */
  private async warm(step: string, load: () => Promise<unknown>): Promise<void> {
    try {
      const items = await load();
      this.logger.log(`Warmed ${step}: ${Array.isArray(items) ? items.length : items} items`);
    } catch (error) {
      this.logger.warn(`Cache warm-up failed for ${step}: ${(error as Error).message}`);
    }
  }
}
