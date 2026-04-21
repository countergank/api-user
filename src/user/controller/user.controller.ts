import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
@ApiTags('users')
@Controller('admin/users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UserController {
  private readonly logger = new CustomLogger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @CreateUserDoc()
  @Post()
  @ApiOperation({ 
    summary: 'Crear nuevo usuario (Admin)', 
    description: 'Crea un nuevo usuario en el sistema. Solo accesible por administradores.' 
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Usuario creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Juan' },
        lastName: { type: 'string', example: 'Pérez' },
        email: { type: 'string', example: 'juan@example.com' },
        userName: { type: 'string', example: 'juanperez' },
        role: { type: 'string', example: 'user', enum: ['admin', 'user', 'viewer'] },
        isActive: { type: 'boolean', example: true },
        createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        updatedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email o username ya existe' })
  @ApiResponse({ status: 403, description: 'Acceso denegado. Se requiere rol admin.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'userName', 'password', 'name', 'lastName', 'role'],
      properties: {
        email: { type: 'string', example: 'newuser@example.com', description: 'Email único' },
        userName: { type: 'string', example: 'newuser', description: 'Nombre de usuario único' },
        password: { type: 'string', example: 'Pass123!', description: 'Contraseña' },
        name: { type: 'string', example: 'Juan', description: 'Nombre' },
        lastName: { type: 'string', example: 'Pérez', description: 'Apellido' },
        role: { type: 'string', example: 'user', enum: ['admin', 'user', 'viewer'], description: 'Rol del usuario' },
      },
    },
  })
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
  @ApiOperation({ 
    summary: 'Obtener usuario por ID (Admin)', 
    description: 'Busca un usuario por su ID. Solo accesible por administradores.' 
  })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
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
  @ApiOperation({ 
    summary: 'Listar todos los usuarios (Admin)', 
    description: 'Retorna lista de todos los usuarios. Solo accesible por administradores.' 
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios' })
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
