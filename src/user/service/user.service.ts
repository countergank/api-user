import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UserAlreadyExistsError } from '../../common/errors/user/user-already-exists.error';
import { CreateUserDTO } from '../dto/create-user.dto';
import { User } from '../entities/user.entity';
import { UserRepository } from '../repository/user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDTO: CreateUserDTO): Promise<User> {
    const alreadyExists = (await this.userRepository.countByUserName(createUserDTO.userName)) > 0;
    if (alreadyExists) {
      throw new UserAlreadyExistsError();
    }
    createUserDTO = plainToInstance(CreateUserDTO, createUserDTO);
    const newUser = createUserDTO.toEntity();
    const createdUser: User = await this.userRepository.create(newUser);
    return createdUser;
  }

  async findAll(): Promise<User[]> {
    const persons: User[] = await this.userRepository.findAll();
    return persons;
  }
}
