import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permissions.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuditAction } from '../../common/audit/audit.decorator';
import { RequestLang } from '../../common/decorators/request-lang.decorator';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { I18nService } from '../../common/i18n/i18n.service';
import {
  CreateUserDoc,
  DeleteUserDoc,
  FindAllUserDoc,
  FindByIdUserDoc,
  MetricsUserDoc,
  ToggleActiveDoc,
  UnlockUserDoc,
  UpdateUserDoc,
  ExportUserDoc,
  ResetPasswordDoc,
  ResendVerificationDoc,
} from '../api-docs/user.decorator';
import { AdminUserDTO } from '../dto/admin-user.dto';
import { AdminUserDetailDTO } from '../dto/admin-user-detail.dto';
import { CreateUserResponseDTO } from '../dto/create-user-response.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UserMetricsResponseDTO } from '../dto/user-metrics.dto';
import { User, UserRole } from '../entities/user.entity';
import { ProfilePhotoUrlResolver } from '../storage/profile-photo-url.resolver';
import { UserService } from '../service/user.service';

/**
 * Controller para gestión de usuarios (ADMIN).
 * Endpoints para crear, buscar y listar usuarios.
 * Requiere JWT con rol admin.
 * @public
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, PermissionGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(I18nService) private i18n: I18nService,
    private readonly avatarUrlResolver: ProfilePhotoUrlResolver,
  ) {}

  private async t(key: string, lang: string | undefined): Promise<string> {
    return this.i18n.translate(key, lang);
  }

  @CreateUserDoc()
  @RequirePermissions('user:create')
  @Post()
  async create(@Body() createUserDTO: CreateUserDTO): Promise<CreateUserResponseDTO> {
    const permissions = await this.userService.assertPermissionsAssignable(createUserDTO.permissions ?? []);

    const user: User = await this.userService.createWithRole({
      email: createUserDTO.email,
      userName: createUserDTO.userName,
      password: createUserDTO.password,
      name: createUserDTO.name,
      lastName: createUserDTO.lastName,
      role: createUserDTO.role,
      permissions,
      isActive: true, // Admin crea usuarios activos
    });
    return CreateUserResponseDTO.of(user);
  }

  @FindAllUserDoc()
  @RequirePermissions('user:read')
  @Get()
  async findAll(@Query() query: PaginationQueryDTO): Promise<PaginatedResponseDTO<AdminUserDTO>> {
    return this.userService.findPaginated(query);
  }

  // Declared before `@Get(':id')` so the parameter route never captures `metrics` as an id.
  @MetricsUserDoc()
  @RequirePermissions('user:read')
  @Get('metrics')
  async metrics(): Promise<UserMetricsResponseDTO> {
    return UserMetricsResponseDTO.of(await this.userService.getMetrics());
  }

  // Declared before `@Get(':id')` so the parameter route never captures `export.csv` as an id.
  @ExportUserDoc()
  @RequirePermissions('user:read')
  @Get('export.csv')
  async exportCsv(@Query() query: PaginationQueryDTO): Promise<StreamableFile> {
    const csv = await this.userService.exportUsersCsv(query);
    return new StreamableFile(new TextEncoder().encode(csv), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="users.csv"',
    });
  }

  @FindByIdUserDoc()
  @RequirePermissions('user:read')
  @Get(':id')
  async findById(@Param('id') id: string): Promise<AdminUserDetailDTO> {
    const user: User = await this.userService.findById(id);
    const permissions = await this.userService.getEffectivePermissions(user);
    return AdminUserDetailDTO.ofDetail(
      user,
      permissions,
      this.avatarUrlResolver.resolve(user.avatarUrl),
    );
  }

  @UnlockUserDoc()
  @RequirePermissions('user:unlock')
  @Patch(':id/unlock')
  async unlock(
    @Param('id') id: string,
    @RequestLang() lang: string | undefined,
  ): Promise<{ message: string; userId: string }> {
    await this.userService.unlockUser(id);
    return { message: await this.t('messages.account_unlocked', lang), userId: id };
  }

  @UpdateUserDoc()
  @RequirePermissions('user:update')
  @AuditAction({
    action: 'USER_UPDATE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string, // id from @Param('id')
  })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO): Promise<AdminUserDTO> {
    // S1/S3: the same catalog rule the create path enforces (COU-268). Validation
    // runs before updateUser, so a rejected name never reaches the transaction.
    const permissions = dto.permissions
      ? await this.userService.assertPermissionsAssignable(dto.permissions)
      : undefined;

    const user: User = await this.userService.updateUser(id, { ...dto, permissions } as UpdateUserDTO);
    return AdminUserDTO.of(user, this.avatarUrlResolver.resolve(user.avatarUrl));
  }

  @DeleteUserDoc()
  @RequirePermissions('user:delete')
  @AuditAction({
    action: 'USER_DELETE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @RequestLang() lang: string | undefined,
  ): Promise<{ message: string; userId: string }> {
    const result = await this.userService.deleteUser(id);
    return { message: await this.t('messages.user_deleted', lang), userId: result.userId };
  }

  @ToggleActiveDoc()
  @RequirePermissions('user:update')
  @AuditAction({
    action: 'USER_TOGGLE_ACTIVE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Patch(':id/active')
  async toggleActive(@Param('id') id: string): Promise<AdminUserDTO> {
    const user: User = await this.userService.toggleActiveUser(id);
    return AdminUserDTO.of(user, this.avatarUrlResolver.resolve(user.avatarUrl));
  }

  @ResendVerificationDoc()
  @RequirePermissions('user:update')
  @AuditAction({
    action: 'user.resend-verification',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Post(':id/resend-verification')
  async resendVerification(
    @Param('id') id: string,
    @RequestLang() lang: string | undefined,
  ): Promise<{ message: string; userId: string }> {
    await this.userService.adminResendVerification(id, lang);
    return { message: await this.t('messages.verification_resent', lang), userId: id };
  }

  @ResetPasswordDoc()
  @RequirePermissions('user:update')
  @AuditAction({
    action: 'user.reset-password',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @RequestLang() lang: string | undefined,
  ): Promise<{ message: string; userId: string }> {
    await this.userService.adminResetPassword(id, lang);
    return { message: await this.t('messages.forgot_password_sent', lang), userId: id };
  }
}
