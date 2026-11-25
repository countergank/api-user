import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PermissionService } from '../../rbac/services/permission.service';
import { RoleService } from '../../rbac/services/role.service';
import { EmailTemplateService } from '../../email/service/email-template.service';

const DEFAULT_STEP_TIMEOUT_MS = 10_000;

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
   * A failed or stalled step is logged and skipped so warm-up trouble can
   * never block application bootstrap; the caches fill on demand as before.
   * Each step is bounded by a timeout because a hung Redis/Mongo call would
   * otherwise delay startup forever.
   */
  private async warm(step: string, load: () => Promise<unknown>): Promise<void> {
    const timeoutMs = this.stepTimeoutMs();
    try {
      const items = await this.withTimeout(load(), timeoutMs, step);
      this.logger.log(`Warmed ${step}: ${Array.isArray(items) ? items.length : items} items`);
    } catch (error) {
      this.logger.warn(`Cache warm-up failed for ${step}: ${this.errorMessage(error)}`);
    }
  }

  private stepTimeoutMs(): number {
    const raw = Number(
      this.configService.get('CACHE_WARMUP_STEP_TIMEOUT_MS', DEFAULT_STEP_TIMEOUT_MS),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STEP_TIMEOUT_MS;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, step: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${step} warm-up timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      timer.unref();
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
  }
}
