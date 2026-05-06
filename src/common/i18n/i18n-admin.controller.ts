import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { I18nService } from './i18n.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/i18n')
@UseGuards(JwtAuthGuard)
export class I18nAdminController {
  constructor(private readonly i18nService: I18nService) {}

  @Post('reload')
  async reload() {
    await this.i18nService.reloadFromMongo();
    return { message: 'Translations reloaded from MongoDB' };
  }
}
