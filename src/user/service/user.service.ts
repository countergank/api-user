import { ConflictException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { UserDTO } from '../dto/user.dto';
import { EncodeService } from '../../encode/encode.service';
import { User, UserRole } from '../entities/user.entity';
import {
  UserAlreadyDeletedError,
  UserEmailAlreadyExistsError,
  UserNameAlreadyExistsError,
  UserNotFoundError,
} from '../errors/error-instances.error';
import { UserRepository } from '../repository/user.repository';
import { AuditAction } from '../../common/audit/audit.decorator';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly encodeService: EncodeService,
  ) {}

  @AuditAction({
    action: 'user.create',
    resource: 'user',
    getResourceId: (result) => (result as User)._id.toString(),
    getAfter: (result) => {
      const u = result as User;
      return { userId: u._id.toString(), email: u.email, role: u.role };
    },
  })
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

  @AuditAction({
    action: 'user.request-email-change',
    resource: 'user',
    getResourceId: (result) => (result as { user: User }).user._id.toString(),
    getBefore: (...args) => ({ userId: args[0], newEmail: args[1] }),
  })
  async requestEmailChange(userId: string, newEmail: string): Promise<{ token: string; expires: Date; user: User }> {
    const existing = await this.findByEmail(newEmail);
    if (existing) {
      throw new ConflictException('EMAIL_ALREADY_EXISTS');
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

  @AuditAction({
    action: 'user.unlock',
    resource: 'user',
    getResourceId: (result) => (result as User)._id.toString(),
  })
  async unlockUser(userId: string): Promise<User> {
    const _user = await this.findById(userId);
    return this.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null as any,
    });
  }

  @AuditAction({
    action: 'user.update',
    resource: 'user',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => {
      const dto = args[1] as Partial<UpdateUserDTO>;
      return { userId: args[0], fields: Object.keys(dto).filter((k) => (dto as any)[k] !== undefined) };
    },
    getAfter: (result) => {
      const u = result as User;
      return { userId: u._id, email: u.email };
    },
  })
  async updateUser(id: string, dto: UpdateUserDTO): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (dto.email) {
      const emailConflict = await this.userRepository.existsByEmailExcludingSelf(dto.email, id);
      if (emailConflict) {
        throw new UserEmailAlreadyExistsError();
      }
    }

    if (dto.userName) {
      const nameConflict = await this.userRepository.existsByNameExcludingSelf(dto.userName, id);
      if (nameConflict) {
        throw new UserNameAlreadyExistsError();
      }
    }

    // Strip undefined values to avoid unintentionally unsetting fields
    const updateData = Object.fromEntries(
      Object.entries(dto).filter(([_, v]) => v !== undefined),
    );

    return this.userRepository.update(id, updateData);
  }

  @AuditAction({
    action: 'user.delete',
    resource: 'user',
    getResourceId: (result) => (result as { userId: string }).userId,
    getBefore: (...args) => ({ userId: args[0] }),
  })
  async deleteUser(id: string): Promise<{ userId: string }> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }

    // Idempotent: if already soft-deleted, return success without modifying
    if (!user.deletedAt) {
      await this.userRepository.softDelete(id);
    }

    return { userId: id };
  }

  @AuditAction({
    action: 'user.toggle-active',
    resource: 'user',
    getResourceId: (result) => (result as User)._id.toString(),
    getBefore: (...args) => ({ userId: args[0] }),
    getAfter: (result) => {
      const u = result as User;
      return { userId: u._id.toString(), isActive: u.isActive };
    },
  })
  async toggleActiveUser(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError();
    }

    if (user.deletedAt) {
      throw new UserAlreadyDeletedError();
    }

    const newIsActive = !user.isActive;
    return this.userRepository.update(id, { isActive: newIsActive });
  }

  async findPaginated(filters: PaginationQueryDTO): Promise<PaginatedUserResponseDTO<UserDTO>> {
    const { users, total } = await this.userRepository.findPaginated({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      role: filters.role,
      isActive: filters.isActive,
      search: filters.search,
    });

    const data = users.map((user) => UserDTO.of(user));
    return PaginatedUserResponseDTO.of(data, total, filters.page, filters.limit);
  }
}
