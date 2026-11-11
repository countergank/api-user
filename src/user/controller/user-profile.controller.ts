import { Body, Controller, Get, HttpCode, Inject, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DomainError } from '../../common/errors/domain.error';
import { EmailEvents } from '../../email/constants/email.events';
import { I18nService } from '../../common/i18n/i18n.service';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentSessionId } from '../../common/decorators/current-session-id.decorator';
import { SessionContext as SessionContextParam } from '../../common/decorators/session-context.decorator';
import { SessionContext } from '../../common/decorators/extract-session-context.helper';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import {
  ApplyChangeEmailDoc,
  ApplyChangePasswordDoc,
  ApplyGetProfileDoc,
  ApplyRequestEmailChangeCodeDoc,
  ApplyUpdateProfileDoc,
  ApplyUploadProfilePhotoDoc,
} from '../api-docs';
import { ChangePasswordDTO } from '../dto/change-password.dto';
import { RequestEmailChangeDTO } from '../dto/request-email-change.dto';
import { UserService } from '../service/user.service';
import { missingPhotoPartError } from '../storage/user-profile-photo.errors';
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
    private moduleRef: ModuleRef,
  ) {}

  // The controller resolves AuthService lazily: AuthModule already depends on
  // this module's graph (AuthModule → RbacModule → UserModule), so an eager
  // import would close a module cycle.
  private get authService(): AuthService {
    return this.moduleRef.get(AuthService, { strict: false });
  }

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
      avatarUrl: user.avatarUrl,
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
      avatarUrl: updated.avatarUrl,
    };
  }

  // S3: the plugin-level `limits.fileSize` makes the stream truncate past the
  // cap, so `toBuffer()` throws before the service ever reads the payload.
  @Post('profile/photo')
  @ApplyUploadProfilePhotoDoc()
  async updateProfilePhoto(@CurrentUser() user: User, @Req() request: FastifyRequest) {
    const part = await request.file();

    if (!part) {
      throw missingPhotoPartError();
    }

    let buffer: Buffer;
    try {
      buffer = await part.toBuffer();
    } catch (error) {
      if (error instanceof Error && error.name === 'RequestFileTooLargeError') {
        throw DomainError.fromKind('PROFILE_PHOTO_TOO_LARGE');
      }
      throw error;
    }

    const { avatarUrl } = await this.userService.updateProfilePhoto(user.id, {
      buffer,
      size: buffer.length,
      mimetype: part.mimetype,
      originalName: part.filename,
    });

    return { avatarUrl };
  }

  @Post('change-password')
  @HttpCode(200)
  @ApplyChangePasswordDoc()
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDTO,
    @RequestLang() lang: string | undefined,
    @CurrentSessionId() sessionId?: string,
    @SessionContextParam() session?: SessionContext,
  ) {
    await this.userService.changePassword(user.id, dto.currentPassword, dto.newPassword);

    this.eventEmitter.emit(EmailEvents.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      name: user.name,
      lang,
    });

    const message = await this.t('messages.password_changed', lang);

    // Other sessions died with the epoch bump inside the service; the acting
    // session keeps working on fresh tokens. Tokens without `sid` (legacy)
    // cannot be rotated, so only the message is returned.
    if (!sessionId) {
      return { message };
    }

    const tokens = await this.authService.rotateCurrentSession(
      user.id,
      sessionId,
      session,
    );

    return {
      message,
      sessionId: tokens.sessionId,
      user: tokens.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
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
