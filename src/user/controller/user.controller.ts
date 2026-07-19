import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import mongoose from 'mongoose';
import { CustomLogger } from '../../common/logger';
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
import {
  UserAlreadyDeletedError,
  UserEmailAlreadyExistsError,
  UserNameAlreadyExistsError,
  UserNotFoundError,
} from '../errors/error-instances.error';
import { UserService } from '../service/user.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { getRequestLang } from '../../common/i18n/request-lang.helper';

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
  private readonly logger = new CustomLogger(UserController.name);
  constructor(
    private readonly userService: UserService,
    @Inject(I18nService) private i18n: I18nService,
  ) {}

  private async t(key: string, req: any): Promise<string> {
    return this.i18n.translate(key, getRequestLang(req));
  }

  @CreateUserDoc()
  @Post()
  async create(@Body() createUserDTO: CreateUserDTO): Promise<CreateUserResponseDTO> {
    try {
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
    } catch (error) {
      if (error instanceof UserNameAlreadyExistsError || error instanceof UserEmailAlreadyExistsError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @FindByIdUserDoc()
  @Get(':id')
  async findById(@Param('id') id: string): Promise<UserDTO> {
    try {
      const user: User = await this.userService.findById(id);
      return UserDTO.of(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      if (error instanceof mongoose.Error.CastError) {
        throw new BadRequestException('INVALID_USER_ID');
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @FindAllUserDoc()
  @Get()
  async findAll(@Query() query?: PaginationQueryDTO): Promise<UserDTO[] | PaginatedUserResponseDTO<UserDTO>> {
    try {
      // Backward compat: if no page param, return plain array
      if (!query || query.page === undefined) {
        const users: User[] = await this.userService.findAll();
        return users.map((user) => UserDTO.of(user));
      }

      // Paginated response
      return this.userService.findPaginated(query);
    } catch (error) {
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @UnlockUserDoc()
  @Patch(':id/unlock')
  async unlock(@Param('id') id: string, @Req() req: any): Promise<{ message: string; userId: string }> {
    try {
      await this.userService.unlockUser(id);
      return { message: await this.t('messages.account_unlocked', req), userId: id };
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      if (error instanceof mongoose.Error.CastError) {
        throw new BadRequestException('INVALID_USER_ID');
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @UpdateUserDoc()
  @AuditAction({
    action: 'USER_UPDATE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string, // id from @Param('id')
  })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDTO): Promise<UserDTO> {
    try {
      const user: User = await this.userService.updateUser(id, dto);
      return UserDTO.of(user);
    } catch (error) {
      if (
        error instanceof UserNotFoundError ||
        error instanceof UserNameAlreadyExistsError ||
        error instanceof UserEmailAlreadyExistsError
      ) {
        throw new BadRequestException(error.getErrorPublic());
      }
      if (error instanceof mongoose.Error.CastError) {
        throw new BadRequestException('INVALID_USER_ID');
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @DeleteUserDoc()
  @AuditAction({
    action: 'USER_DELETE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any): Promise<{ message: string; userId: string }> {
    try {
      const result = await this.userService.deleteUser(id);
      return { message: await this.t('messages.user_deleted', req), userId: result.userId };
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      if (error instanceof mongoose.Error.CastError) {
        throw new BadRequestException('INVALID_USER_ID');
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @ToggleActiveDoc()
  @AuditAction({
    action: 'USER_TOGGLE_ACTIVE',
    resource: 'user',
    getResourceId: (_result: unknown, args: unknown[]) => args[0] as string,
  })
  @Patch(':id/active')
  async toggleActive(@Param('id') id: string): Promise<UserDTO> {
    try {
      const user: User = await this.userService.toggleActiveUser(id);
      return UserDTO.of(user);
    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof UserAlreadyDeletedError) {
        throw new BadRequestException(error.getErrorPublic());
      }
      if (error instanceof mongoose.Error.CastError) {
        throw new BadRequestException('INVALID_USER_ID');
      }
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }
}
