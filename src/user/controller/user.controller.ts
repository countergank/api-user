import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import {
  CreateUserDoc,
  DeleteUserDoc,
  FindAllUserDoc,
  FindByIdUserDoc,
  ToggleActiveDoc,
  UnlockUserDoc,
  UpdateUserDoc,
} from '../api-docs/user.decorator';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CreateUserResponseDTO } from '../dto/create-user-response.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UserDTO } from '../dto/user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../service/user.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { RequestLang } from '../../common/decorators/request-lang.decorator';

/**
 * Controller para gestión de usuarios (ADMIN).
 * Endpoints para crear, buscar y listar usuarios.
 * Requiere JWT con rol admin.
 * @public
 */
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, lang: string | undefined): Promise<string> {
    return this.i18n.translate(key, lang);
  }

  @CreateUserDoc()
  @Post()
  async create(@Body() createUserDTO: CreateUserDTO): Promise<CreateUserResponseDTO> {
    const user: User = await this.userService.createWithRole({
      email: createUserDTO.email,
      userName: createUserDTO.userName,
      password: createUserDTO.password,
      name: createUserDTO.name,
      lastName: createUserDTO.lastName,
      role: createUserDTO.role,
      permissions: [],
      isActive: true, // Admin crea usuarios activos
    });
    return CreateUserResponseDTO.of(user);
  }

  @FindAllUserDoc()
  @Get()
  async findAll(@Query() query?: PaginationQueryDTO): Promise<UserDTO[] | PaginatedUserResponseDTO<UserDTO>> {
    // Backward compat: if no page param, return plain array
    if (!query || query.page === undefined) {
      const users: User[] = await this.userService.findAll();
      return users.map((user) => UserDTO.of(user));
    }

    // Paginated response
    return this.userService.findPaginated(query);
  }

  @FindByIdUserDoc()
  @Get(':id')
  async findById(@Param('id') id: string): Promise<UserDTO> {
    const user: User = await this.userService.findById(id);
    return UserDTO.of(user);
  }

  @UnlockUserDoc()
  @Patch(':id/unlock')
  async unlock(@Param('id') id: string, @RequestLang() lang: string | undefined): Promise<{ message: string; userId: string }> {
    await this.userService.unlockUser(id);
    return { message: await this.t('messages.account_unlocked', lang), userId: id };
  }

  @UpdateUserDoc()
  @AuditAction({
    action: 'USER_UPDATE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string, // id from @Param('id')
  })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO): Promise<UserDTO> {
    const user: User = await this.userService.updateUser(id, dto);
    return UserDTO.of(user);
  }

  @DeleteUserDoc()
  @AuditAction({
    action: 'USER_DELETE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Delete(':id')
  async delete(@Param('id') id: string, @RequestLang() lang: string | undefined): Promise<{ message: string; userId: string }> {
    const result = await this.userService.deleteUser(id);
    return { message: await this.t('messages.user_deleted', lang), userId: result.userId };
  }

  @ToggleActiveDoc()
  @AuditAction({
    action: 'USER_TOGGLE_ACTIVE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Patch(':id/active')
  async toggleActive(@Param('id') id: string): Promise<UserDTO> {
    const user: User = await this.userService.toggleActiveUser(id);
    return UserDTO.of(user);
  }
}
