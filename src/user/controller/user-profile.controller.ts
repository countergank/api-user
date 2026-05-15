import { BadRequestException, Body, Controller, Get, HttpCode, Inject, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailEvents } from '../../email/constants/email.events';
import { EncodeService } from '../../encode/encode.service';
import { getRequestLang } from '../../common/i18n/request-lang.helper';
import { I18nService } from '../../common/i18n/i18n.service';
import { ApplyChangeEmailDoc, ApplyChangePasswordDoc, ApplyGetProfileDoc, ApplyUpdateProfileDoc } from '../api-docs';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { UserService } from '../service/user.service';

/**
 * Controller para gestión del perfil del usuario autenticado.
 * @public
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(
    private userService: UserService,
    private encodeService: EncodeService,
    private eventEmitter: EventEmitter2,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, req: any): Promise<string> {
    return this.i18n.translate(key, getRequestLang(req));
  }

  @Get('profile')
  @ApplyGetProfileDoc()
  async getProfile(@Request() req) {
    const user = req.user;
    return {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Patch('profile')
  @ApplyUpdateProfileDoc()
  async updateProfile(@Request() req, @Body() body: { name?: string; lastName?: string }) {
    const user = await this.userService.update(req.user.id, {
      name: body.name,
      lastName: body.lastName,
    });
    return {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Post('change-password')
  @HttpCode(200)
  @ApplyChangePasswordDoc()
  async changePassword(@Request() req, @Body() dto: ChangePasswordDTO) {
    const user = req.user;
    const isValid = await this.encodeService.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userService.update(user.id, {
      password: dto.newPassword,
    });

    this.eventEmitter.emit(EmailEvents.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      name: user.name,
      lang: getRequestLang(req),
    });

    return { message: await this.t('messages.password_changed', req) };
  }

  @Post('change-email')
  @HttpCode(200)
  @ApplyChangeEmailDoc()
  async changeEmail(@Request() req, @Body() body: { email: string }) {
    const user = req.user;
    const { token } = await this.userService.requestEmailChange(user.id, body.email);

    this.eventEmitter.emit(EmailEvents.EMAIL_CHANGE_REQUESTED, {
      userId: user.id,
      newEmail: body.email,
      name: user.name,
      pendingEmailToken: token,
      lang: getRequestLang(req),
    });

    return { message: await this.t('messages.email_change_sent', req) };
  }
}
