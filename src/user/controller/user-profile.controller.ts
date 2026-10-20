import { Body, Controller, Get, HttpCode, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { EmailEvents } from '../../email/constants/email.events';
import { I18nService } from '../../common/i18n/i18n.service';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import {
  ApplyChangeEmailDoc,
  ApplyChangePasswordDoc,
  ApplyGetProfileDoc,
  ApplyRequestEmailChangeCodeDoc,
  ApplyUpdateProfileDoc,
} from '../api-docs';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { RequestEmailChangeDTO } from '../dto/request-email-change.dto';
import { UserService } from '../service/user.service';
import { User } from '../entities/user.entity';

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
    private eventEmitter: EventEmitter2,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, lang: string | undefined): Promise<string> {
    return this.i18n.translate(key, lang);
  }

  @Get('profile')
  @ApplyGetProfileDoc()
  async getProfile(@CurrentUser() user: User) {
    return {
      name: user.name,
      lastName: user.lastName,
      email: user.email,
    };
  }

  @Patch('profile')
  @ApplyUpdateProfileDoc()
  async updateProfile(@CurrentUser() user: User, @Body() body: { name?: string; lastName?: string }) {
    const updated = await this.userService.update(user.id, {
      name: body.name,
      lastName: body.lastName,
    });
    return {
      name: updated.name,
      lastName: updated.lastName,
      email: updated.email,
    };
  }

  @Post('change-password')
  @HttpCode(200)
  @ApplyChangePasswordDoc()
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDTO,
    @RequestLang() lang: string | undefined,
  ) {
    await this.userService.changePassword(user.id, dto.currentPassword, dto.newPassword);

    this.eventEmitter.emit(EmailEvents.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      name: user.name,
      lang,
    });

    return { message: await this.t('messages.password_changed', lang) };
  }

  @Post('change-email/code')
  @HttpCode(200)
  @ApplyRequestEmailChangeCodeDoc()
  @AuditAction({
    action: 'user.request-email-change-code',
    resource: 'user',
    // S8: the code never reaches the audit log — only the actor is recorded.
    getResourceId: (_result: unknown, args: unknown[]) => (args[0] as User)?.id,
  })
  async requestEmailChangeCode(@CurrentUser() user: User, @RequestLang() lang: string | undefined) {
    const { code, expires, user: current } = await this.userService.requestEmailChangeCode(user.id);

    // S10/S12: the code goes to the address the account already has, in memory
    // only. It never leaves through the HTTP response (S8).
    this.eventEmitter.emit(EmailEvents.EMAIL_CHANGE_CODE_REQUESTED, {
      userId: user.id,
      email: current.email,
      name: current.name,
      code,
      expiresAt: expires,
      lang,
    });

    return { message: await this.t('messages.email_change_code_sent', lang) };
  }

  @Post('change-email')
  @HttpCode(200)
  @ApplyChangeEmailDoc()
  @AuditAction({
    action: 'user.request-email-change',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => (args[0] as User)?.id,
  })
  async changeEmail(
    @CurrentUser() user: User,
    @Body() dto: RequestEmailChangeDTO,
    @RequestLang() lang: string | undefined,
  ) {
    const { token } = await this.userService.requestEmailChange(user.id, dto);

    this.eventEmitter.emit(EmailEvents.EMAIL_CHANGE_REQUESTED, {
      userId: user.id,
      newEmail: dto.email,
      name: user.name,
      pendingEmailToken: token,
      lang,
    });

    return { message: await this.t('messages.email_change_sent', lang) };
  }
}
