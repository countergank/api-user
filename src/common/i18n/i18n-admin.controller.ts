import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { I18nService } from './i18n.service';
import { RequestLang } from '../../common/decorators/request-lang.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/i18n')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class I18nAdminController {
  constructor(private readonly i18nService: I18nService) {}

  @Post('reload')
  @RequirePermissions('i18n:reload')
  async reload(@RequestLang() lang: string | undefined) {
    await this.i18nService.reloadFromMongo();
    return { message: await this.i18nService.translate('messages.translations_reloaded', lang) };
  }
}
