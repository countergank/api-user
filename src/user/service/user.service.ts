import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from '../dto/create-user.dto';
import { EncodeService } from '../../encode/encode.service';
import { User, UserRole } from '../entities/user.entity';
import {
  UserEmailAlreadyExistsError,
  UserNameAlreadyExistsError,
  UserNotFoundError,
} from '../errors/error-instances.error';
import { UserRepository } from '../repository/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly encodeService: EncodeService,
  ) {}

  async create(createUserDTO: CreateUserDTO): Promise<User> {
    const [usernameAlreadyExists, emailAlreadyExists] = await Promise.all([
      this.userRepository.existsByName(createUserDTO.userName),
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

  async createWithRole(data: {
    email: string;
    userName: string;
    password: string;
    name: string;
    lastName: string;
    role: UserRole;
    permissions: string[];
    isActive: boolean;
  }): Promise<User> {
    const [usernameAlreadyExists, emailAlreadyExists] = await Promise.all([
      this.userRepository.existsByName(data.userName),
      this.userRepository.existsByEmail(data.email),
    ]);

    if (usernameAlreadyExists) {
      throw new UserNameAlreadyExistsError();
    }
    if (emailAlreadyExists) {
      throw new UserEmailAlreadyExistsError();
    }

    return this.userRepository.createWithRole(data);
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

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository.findByResetToken(token);
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findByEmailVerificationToken(token);
  }

  async findByPendingEmailToken(token: string): Promise<User | null> {
    return this.userRepository.findByPendingEmailToken(token);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.userRepository.update(id, data);
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return this.encodeService.compare(password, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return this.encodeService.hash(password);
  }

  async existsByEmailOrUsername(email: string, userName: string): Promise<boolean> {
    const [emailExists, usernameExists] = await Promise.all([
      this.userRepository.existsByEmail(email),
      this.userRepository.existsByName(userName),
    ]);
    return emailExists || usernameExists;
  }

  async requestEmailChange(
    userId: string,
    newEmail: string,
  ): Promise<{ token: string; expires: Date; user: User }> {
    const existing = await this.findByEmail(newEmail);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.findById(userId);
    const token = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.update(userId, {
      pendingEmail: newEmail,
      pendingEmailToken: token,
      pendingEmailExpires: expires,
    });

    return { token, expires, user };
  }
}
