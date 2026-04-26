import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Param, Post, UseGuards } from '@nestjs/common';
import { CustomLogger } from '../../common/logger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateUserDoc, FindAllUserDoc, FindByIdUserDoc } from '../api-docs/user.decorator';
import { CreateUserResponseDTO } from '../dto/create-user-response.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UserDTO } from '../dto/user.dto';
import { User } from '../entities/user.entity';
import {
  UserEmailAlreadyExistsError,
  UserNameAlreadyExistsError,
  UserNotFoundError,
} from '../errors/error-instances.error';
import { UserService } from '../service/user.service';

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
  constructor(private readonly userService: UserService) {}

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
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }

  @FindAllUserDoc()
  @Get()
  async findAll(): Promise<UserDTO[]> {
    try {
      const users: User[] = await this.userService.findAll();
      return users.map((user) => UserDTO.of(user));
    } catch (error) {
      const err = error as Error;
      this.logger.error(err.message, err.stack);
      throw new InternalServerErrorException();
    }
  }
}