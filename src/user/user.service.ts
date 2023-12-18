import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UserEmailAlreadyExistsError } from './errors/user-email-already-exists.error';
import { UserNameAlreadyExistsError } from './errors/user-name-already-exists.error';
import { UserNotFoundError } from './errors/user-not-found.error';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDTO: CreateUserDTO): Promise<User> {
    const [usernameAlreadyExists, emailAlreadyExists] = await Promise.all([
      this.userRepository.existsByUsername(createUserDTO.userName),
      this.userRepository.existsByEmail(createUserDTO.email),
    ]);

    if (usernameAlreadyExists) {
      throw new UserNameAlreadyExistsError();
    }
    if (emailAlreadyExists) {
      throw new UserEmailAlreadyExistsError();
    }
    createUserDTO = plainToInstance(CreateUserDTO, createUserDTO);
    const newUser = createUserDTO.toEntity();
    const createdUser: User = await this.userRepository.create(newUser);
    return createdUser;
  }

  async findAll(): Promise<User[]> {
    const users: User[] = await this.userRepository.findAll();
    return users;
  }

  async findById(id: string): Promise<User> {
    const user: User = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }
    return user;
  }
}
