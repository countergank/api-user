import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { I18nService } from './i18n.service';
import { getRequestLang } from './request-lang.helper';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/i18n')
@UseGuards(JwtAuthGuard)
export class I18nAdminController {
  constructor(private readonly i18nService: I18nService) {}

  @Post('reload')
  async reload(@Req() req: any) {
    await this.i18nService.reloadFromMongo();
    const lang = getRequestLang(req);
    return { message: await this.i18nService.translate('messages.translations_reloaded', lang) };
  }
}
