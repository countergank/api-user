import { Controller, Delete, Get, HttpCode, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditAction } from '../../common/audit/audit.decorator';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { ActiveSessionService } from '../../session/active-session.service';
import { ActiveSessionDTO } from '../../session/dto/active-session.dto';
import { ListSessionsDoc, LogoutAllSessionsDoc, RevokeSessionDoc } from '../../session/api-docs/session.decorator';
import { UserRole } from '../entities/user.entity';
import { UserService } from '../service/user.service';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSessionController {
  constructor(
    private readonly userService: UserService,
    private readonly activeSessionService: ActiveSessionService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, lang: string | undefined): Promise<string> {
    return this.i18n.translate(key, lang);
  }

  @ListSessionsDoc()
  @RequirePermissions('session:read')
  @AuditAction({
    action: 'USER_SESSION_LIST',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string, // id from @Param('id')
  })
  @Get(':id/sessions')
  async listSessions(@Param('id') id: string): Promise<ActiveSessionDTO[]> {
    await this.userService.findById(id);
    const sessions = await this.activeSessionService.listForUser(id);
    return sessions.map(ActiveSessionDTO.of);
  }

  @RevokeSessionDoc()
  @RequirePermissions('session:revoke')
  @AuditAction({
    action: 'USER_SESSION_REVOKE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Delete(':id/sessions/:sessionId')
  async revokeSession(
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
    @RequestLang() lang: string | undefined,
  ): Promise<{ message: string }> {
    await this.userService.findById(id);
    const revoked = await this.activeSessionService.revokeSession(id, sessionId);
    if (!revoked) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }
    return { message: await this.t('messages.session_revoked', lang) };
  }

  @LogoutAllSessionsDoc()
  @RequirePermissions('session:revoke')
  @HttpCode(200)
  @AuditAction({
    action: 'USER_SESSION_REVOKE_ALL',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Post(':id/logout-all')
  async logoutAll(
    @Param('id') id: string,
    @RequestLang() lang: string | undefined,
  ): Promise<{ message: string }> {
    await this.userService.findById(id);
    // El bump de epoch invalida los access tokens ya emitidos vía JwtStrategy;
    // el clear elimina los registros que alimentan el listado.
    await this.userService.bumpSessionEpoch(id);
    await this.activeSessionService.clearForUser(id);
    return { message: await this.t('messages.sessions_revoked_all', lang) };
  }
}
