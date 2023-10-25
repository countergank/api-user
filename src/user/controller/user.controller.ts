import { BadRequestException, Body, Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDoc } from '../../common/decorators/swagger/user.decorator';
import { UserAlreadyExistsError } from '../../common/errors/user/user-already-exists.error';
import { CustomLogger } from '../../common/logger';
import { CreateUserResponseDTO } from '../dto/create-user-response.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { User } from '../entities/user.entity';
import { UserService } from '../service/user.service';

@ApiTags('User')
@Controller({ path: 'user', version: '1' })
export class UserController {
  private readonly logger = new CustomLogger(UserController.name);
  constructor(private readonly userService: UserService) {}

  @CreateUserDoc()
  @Post('signUp')
  async signUp(@Body() createUserDTO: CreateUserDTO): Promise<CreateUserResponseDTO> {
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
}
