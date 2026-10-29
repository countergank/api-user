import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { Permission } from '../../rbac/entities/permission.entity';
import { CreateUserDTO } from '../dto/create-user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { AdminUserDTO } from '../dto/admin-user.dto';
import { EncodeService } from '../../encode/encode.service';
import { User, UserRole } from '../entities/user.entity';
import { DomainError } from '../../common/errors/domain.error';
import { UserRepository } from '../repository/user.repository';
import { AuditAction } from '../../common/audit/audit.decorator';
import { runInTransaction } from '../../common/utils/transaction';
import { CacheService } from '../../config/cache';

import {
  EMAIL_CHANGE_CODE_MAX_ATTEMPTS,
  EMAIL_CHANGE_CODE_RESEND_INTERVAL_MS,
  EMAIL_CHANGE_CODE_TTL_MS,
  EMAIL_CHANGE_CONFIRMATION_TTL_MS,
  generateEmailChangeCode,
  hashEmailChangeCode,
  isEmailChangeCodeValid,
} from './email-change-code';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly encodeService: EncodeService,
    @InjectConnection() private readonly connection: Connection,
    private readonly cacheService: CacheService,
    @InjectModel(Permission.name) private readonly permissionModel: Model<Permission>,
  ) {}

  private async invalidateUserCache(userId: string): Promise<void> {
    await this.cacheService.del(`user:${userId}`);
  }

  /**
   * Purges the cached user document of every user holding the given role.
   * Used when a role's permissions change so the effective permissions are
   * re-resolved on the next authenticated request.
   */
  async invalidateUsersByRole(role: UserRole): Promise<void> {
    const ids = await this.userRepository.findIdsByRole(role);
    await Promise.all(ids.map((id) => this.invalidateUserCache(id)));
  }

  /**
   * Returns the ids of the users currently assigned to the given role (S17).
   *
   * Exposed so `RoleService` can refuse to delete a role still held by users
   * (S10) without pulling whole user documents just to count them.
   */
  async findIdsByRole(role: UserRole): Promise<string[]> {
    return this.userRepository.findIdsByRole(role);
  }

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
      throw DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
    }
    if (emailAlreadyExists) {
      throw DomainError.fromKind('ENTITY_EMAIL_ALREADY_EXISTS');
    }
    createUserDTO = plainToInstance(CreateUserDTO, createUserDTO);
    const newUser = createUserDTO.toEntity();
    const createdUser: User = await this.userRepository.create(newUser);
    this.invalidateUserCache(createdUser._id.toString());
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
      throw DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
    }
    if (emailAlreadyExists) {
      throw DomainError.fromKind('ENTITY_EMAIL_ALREADY_EXISTS');
    }

    const created = await this.userRepository.createWithRole({ ...data, permissions: data.permissions ?? [] });
    this.invalidateUserCache(created._id.toString());
    return created;
  }

  /**
   * Validates the explicit permissions an admin assigns through the admin API
   * (S2, S5) and deduplicates them preserving order (S11).
   *
   * It is intentionally NOT called from `createWithRole`: internal callers such as
   * the RBAC e2e seeds and the guard's wildcard coverage must be able to grant `*`.
   * The HTTP boundary is where an unknown or wildcard permission must be rejected
   * (S10), so `POST /admin/users` calls this before creating the user.
   *
   * @throws DomainError VALIDATION_ERROR (UA-COM-005) listing the rejected names.
   */
  async assertPermissionsAssignable(permissions: string[]): Promise<string[]> {
    const deduplicated = [...new Set(permissions ?? [])];
    if (deduplicated.length === 0) {
      return [];
    }

    const catalog = await this.permissionModel
      .find({ name: { $in: deduplicated } })
      .lean()
      .exec();
    const known = new Set(catalog.map((permission) => (permission as { name: string }).name));
    const rejected = deduplicated.filter((name) => name === '*' || !known.has(name));

    if (rejected.length > 0) {
      throw DomainError.fromKind('VALIDATION_ERROR', {
        message: `Unknown permissions: ${rejected.join(', ')}`,
      });
    }

    return deduplicated;
  }

  async findAll(): Promise<User[]> {
    const users: User[] = await this.userRepository.findAll();
    return users;
  }

  async findById(id: string, opts?: { includePassword?: boolean }): Promise<User> {
    const user: User = await this.userRepository.findById(id, opts);
    if (!user) {
      throw DomainError.fromKind('USER_NOT_FOUND');
    }
    return user;
  }

  async findByEmail(email: string, opts?: { includePassword?: boolean }): Promise<User | null> {
    return this.userRepository.findByEmail(email, opts);
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

  async findByEmailRevertToken(token: string): Promise<User | null> {
    return this.userRepository.findByEmailRevertToken(token);
  }

  /**
   * @param session — optional transaction session; without it the write commits
   * on its own.
   */
  async update(id: string, data: Partial<User>, session?: ClientSession): Promise<User> {
    const updated = await this.userRepository.update(id, data, session);
    this.invalidateUserCache(id);
    return updated;
  }

  /**
   * @param session — optional transaction session; without it the write commits
   * on its own.
   */
  async unsetFields(id: string, fields: string[], session?: ClientSession): Promise<User> {
    const updated = await this.userRepository.unsetFields(id, fields, session);
    this.invalidateUserCache(id);
    return updated;
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return this.encodeService.compare(password, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return this.encodeService.hash(password);
  }

  /**
   * Invalidates every refresh token issued for the user so far by bumping the
   * durable session epoch (S16).
   *
   * Call it with the transaction session that also commits the credential change
   * (S17): if the bump fails, the credential change must not survive either.
   *
   * @returns the new epoch of the user.
   */
  async bumpSessionEpoch(userId: string, session?: ClientSession): Promise<number> {
    const user = await this.userRepository.bumpSessionEpoch(userId, session);
    if (!user) {
      throw DomainError.fromKind('USER_NOT_FOUND');
    }
    this.invalidateUserCache(userId);
    return user.sessionEpoch;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.findById(userId, { includePassword: true });
    if (!(await this.validatePassword(currentPassword, user.password))) {
      throw DomainError.fromKind('CURRENT_PASSWORD_INCORRECT');
    }
    const hashed = await this.hashPassword(newPassword);

    // S4/S9/S17: the new credential and the session-epoch bump are committed by
    // the same transaction. If the bump fails, the password change is rolled
    // back instead of leaving the old refresh tokens alive.
    await runInTransaction(this.connection, async (session) => {
      await this.userRepository.update(userId, { password: hashed }, session);
      await this.bumpSessionEpoch(userId, session);
    });
  }

  async existsByEmailOrUsername(email: string, userName: string): Promise<boolean> {
    const [emailExists, usernameExists] = await Promise.all([
      this.userRepository.existsByEmail(email),
      this.userRepository.existsByName(userName),
    ]);
    return emailExists || usernameExists;
  }

  @AuditAction({
    action: 'user.request-email-change-code',
    resource: 'user',
    getResourceId: (result) => (result as { user: User }).user._id.toString(),
    // S8: only the user id is auditable — the code and its hash never are.
    getBefore: (...args) => ({ userId: args[0] }),
  })
  async requestEmailChangeCode(userId: string): Promise<{ code: string; expires: Date; user: User }> {
    const user = await this.findById(userId);
    const now = Date.now();

    // S11: one code per minute. The throttle is measured from the last *send*,
    // so a failed validation does not let the caller mint a fresh attempt budget.
    if (
      user.emailChangeCodeSentAt &&
      now - user.emailChangeCodeSentAt.getTime() < EMAIL_CHANGE_CODE_RESEND_INTERVAL_MS
    ) {
      throw DomainError.fromKind('VALIDATION_ERROR', {
        message: 'An email change code was sent recently, please wait before requesting a new one',
      });
    }

    const code = generateEmailChangeCode();
    const expires = new Date(now + EMAIL_CHANGE_CODE_TTL_MS);

    await this.update(userId, {
      emailChangeCodeHash: hashEmailChangeCode(code, userId),
      emailChangeCodeExpires: expires,
      emailChangeCodeAttempts: 0,
      emailChangeCodeSentAt: new Date(now),
    });

    // The plaintext code travels to the caller in memory so it can be mailed to
    // the current address; it is never persisted, logged nor returned over HTTP (S8).
    return { code, expires, user };
  }

  @AuditAction({
    action: 'user.request-email-change',
    resource: 'user',
    getResourceId: (result) => (result as { user: User }).user._id.toString(),
    // S8: the DTO carries the plaintext code, so only the fields worth auditing
    // are picked explicitly.
    getBefore: (...args) => {
      const dto = args[1] as { email?: string } | undefined;
      return { userId: args[0], newEmail: dto?.email };
    },
  })
  async requestEmailChange(
    userId: string,
    data: { email: string; code: string },
  ): Promise<{ token: string; expires: Date; user: User }> {
    const user = await this.findById(userId);

    // S7: asking for the email the account already has is a client mistake, not
    // an identity failure, so it answers 400 before touching the code budget.
    if (user.email === data.email) {
      throw DomainError.fromKind('VALIDATION_ERROR', {
        message: 'The new email must be different from the current one',
      });
    }

    await this.assertEmailChangeCode(userId, user, data.code);

    // Only once the caller proved control of the current mailbox is it revealed
    // whether the target address is taken.
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw DomainError.fromKind('EMAIL_ALREADY_EXISTS');
    }

    const token = randomUUID();
    const expires = new Date(Date.now() + EMAIL_CHANGE_CONFIRMATION_TTL_MS);

    await this.update(userId, {
      pendingEmail: data.email,
      pendingEmailToken: token,
      pendingEmailExpires: expires,
    });

    this.invalidateUserCache(userId);
    return { token, expires, user };
  }

  /**
   * Validates the identity-proof code against the stored hash (S1, S2, S11).
   *
   * Every failure increments the attempt counter and, once the budget is spent,
   * the code is destroyed so a stolen hash cannot be brute-forced later. A valid
   * code is consumed immediately: it is single use, whatever happens next.
   *
   * @throws DomainError INVALID_EMAIL_CHANGE_CODE for a missing, expired, spent
   * or mismatching code — the same answer for all four, so the response never
   * tells an attacker which one it was.
   */
  private async assertEmailChangeCode(userId: string, user: User, code: string): Promise<void> {
    const hash = user.emailChangeCodeHash;
    const expires = user.emailChangeCodeExpires;
    const attempts = user.emailChangeCodeAttempts ?? 0;

    if (!hash || !expires || expires < new Date() || attempts >= EMAIL_CHANGE_CODE_MAX_ATTEMPTS) {
      if (hash) {
        await this.clearEmailChangeCode(userId);
      }
      throw DomainError.fromKind('INVALID_EMAIL_CHANGE_CODE');
    }

    if (!isEmailChangeCodeValid(code, userId, hash)) {
      const failedAttempts = attempts + 1;
      if (failedAttempts >= EMAIL_CHANGE_CODE_MAX_ATTEMPTS) {
        await this.clearEmailChangeCode(userId);
      } else {
        await this.update(userId, { emailChangeCodeAttempts: failedAttempts });
      }
      throw DomainError.fromKind('INVALID_EMAIL_CHANGE_CODE');
    }

    await this.clearEmailChangeCode(userId);
  }

  /** Destroys the identity-proof code state (single use, exhausted or expired). */
  private async clearEmailChangeCode(userId: string): Promise<void> {
    await this.unsetFields(userId, ['emailChangeCodeHash', 'emailChangeCodeExpires']);
    await this.update(userId, { emailChangeCodeAttempts: 0 });
  }

  @AuditAction({
    action: 'user.unlock',
    resource: 'user',
    getResourceId: (result) => (result as User)._id.toString(),
  })
  async unlockUser(userId: string): Promise<User> {
    const _user = await this.findById(userId);
    const updated = await this.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null as any,
    });
    this.invalidateUserCache(userId);
    return updated;
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
    const result = await runInTransaction(this.connection, async () => {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw DomainError.fromKind('USER_NOT_FOUND');
      }

      if (dto.email) {
        const emailConflict = await this.userRepository.existsByEmailExcludingSelf(dto.email, id);
        if (emailConflict) {
          throw DomainError.fromKind('ENTITY_EMAIL_ALREADY_EXISTS');
        }
      }

      if (dto.userName) {
        const nameConflict = await this.userRepository.existsByNameExcludingSelf(dto.userName, id);
        if (nameConflict) {
          throw DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
        }
      }

      // Strip undefined values to avoid unintentionally unsetting fields
      const updateData = Object.fromEntries(Object.entries(dto).filter(([_, v]) => v !== undefined));

      return this.userRepository.update(id, updateData);
    });

    this.invalidateUserCache(id);
    return result;
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
      throw DomainError.fromKind('USER_NOT_FOUND');
    }

    // Idempotent: if already soft-deleted, return success without modifying
    if (!user.deletedAt) {
      await this.userRepository.softDelete(id);
    }

    this.invalidateUserCache(id);
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
      throw DomainError.fromKind('USER_NOT_FOUND');
    }

    if (user.deletedAt) {
      throw DomainError.fromKind('USER_ALREADY_DELETED');
    }

    const newIsActive = !user.isActive;
    const updated = await this.userRepository.update(id, { isActive: newIsActive });
    this.invalidateUserCache(id);
    return updated;
  }

  async findPaginated(filters: PaginationQueryDTO): Promise<PaginatedUserResponseDTO<AdminUserDTO>> {
    const { users, total } = await this.userRepository.findPaginated({
      page: filters.page,
      limit: filters.limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      role: filters.role,
      isActive: filters.isActive,
      search: filters.search,
    });

    const data = users.map((user) => AdminUserDTO.of(user));
    return PaginatedUserResponseDTO.of(data, total, filters.page, filters.limit);
  }
}
