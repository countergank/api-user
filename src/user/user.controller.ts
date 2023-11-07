import { BadRequestException, Body, Controller, Get, InternalServerErrorException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDoc, RetrieveByIdUserDoc, RetrieveUserDoc } from '../common/decorators/swagger/user.decorator';
import { UserAlreadyExistsError } from '../common/errors/user/user-already-exists.error';
import { UserNotFoundError } from '../common/errors/user/user-not-found.error';
import { CustomLogger } from '../common/logger';
import { CreateUserResponseDTO } from './dto/create-user-response.dto';
import { CreateUserDTO } from './dto/create-user.dto';
import { UserDTO } from './dto/user.dto';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

@ApiTags('User')
@Controller({ path: 'user', version: '1' })
export class UserController {
  private readonly logger = new CustomLogger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @CreateUserDoc()
  @Post('create')
  async create(@Body() createUserDTO: CreateUserDTO): Promise<CreateUserResponseDTO> {
    try {
      const user: User = await this.userService.create(createUserDTO);
      return CreateUserResponseDTO.of(user);
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new BadRequestException(error.fullMessage);
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }

  @RetrieveByIdUserDoc()
  @Get('retrieve/:id')
  async retrieveById(@Param() id: string): Promise<UserDTO> {
    try {
      const user: User = await this.userService.findById(id);
      return UserDTO.of(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new BadRequestException(error.fullMessage);
      }
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }

  @RetrieveUserDoc()
  @Get('retrieve')
  async retrieve(): Promise<UserDTO[]> {
    try {
      const users: User[] = await this.userService.findAll();
      return users.map((user) => UserDTO.of(user));
    } catch (error) {
      this.logger.error(error.message, error.stack);
      throw new InternalServerErrorException();
    }
  }
}
