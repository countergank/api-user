import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomLogger } from '../../common/logger';
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

@ApiTags('users')
@Controller('admin/users')
export class UserController {
  private readonly logger = new CustomLogger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @CreateUserDoc()
  @Post()
  async create(@Body() createUserDTO: CreateUserDTO): Promise<CreateUserResponseDTO> {
    try {
      const user: User = await this.userService.create(createUserDTO);
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
