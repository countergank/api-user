import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { ClientSession, Connection, Model } from 'mongoose';
import { AuditAction } from '../../common/audit/audit.decorator';
import { PaginatedResponseDTO } from '../../common/dto/paginated-response.dto';
import { DomainError } from '../../common/errors/domain.error';
import { runInTransaction } from '../../common/utils/transaction';
import { toCsv } from '../../common/utils/csv';
import { EncodeService } from '../../encode/encode.service';
import { EmailEvents } from '../../email/constants/email.events';
import { mergeEffectivePermissions } from '../../rbac/services/effective-permissions';
import { Permission } from '../../rbac/entities/permission.entity';
import { Role } from '../../rbac/entities/role.entity';
import { AdminUserDTO, ADMIN_USER_CSV_HEADERS } from '../dto/admin-user.dto';
import { CreateUserDTO } from '../dto/create-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { UserMetrics } from '../dto/user-metrics.dto';
import { User, UserRole } from '../entities/user.entity';
import { UserRepository } from '../repository/user.repository';
import {
  detectPhotoExtension,
  PROFILE_PHOTO_MAX_BYTES,
  ProfilePhotoFile,
} from '../storage/user-profile-photo.storage';
import {
  PROFILE_PHOTO_STORAGE,
  ProfilePhotoStorage,
} from '../storage/profile-photo-storage';
import { ProfilePhotoUrlResolver } from '../storage/profile-photo-url.resolver';
import {
  emptyProfilePhotoError,
  photoLimitExceededError,
} from '../storage/user-profile-photo.errors';

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
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly encodeService: EncodeService,
    @Inject(PROFILE_PHOTO_STORAGE) private readonly photoStorage: ProfilePhotoStorage,
    private readonly avatarUrlResolver: ProfilePhotoUrlResolver,
    @InjectConnection() private readonly connection: Connection,
    private readonly eventEmitter: EventEmitter2,
    @InjectModel(Permission.name) private readonly permissionModel: Model<Permission>,
    @InjectModel(Role.name) private readonly roleModel: Model<Role>,
  ) {}

  // Invalidation is reactive: this only emits; CacheService performs the
  // Redis deletion.
  private invalidateUserCache(userId: string): void {
    this.eventEmitter.emit('cache.invalidate.user', { pattern: `cache:user:${userId}` });
  }

  /**
   * Purges every cached user document. Used when a role's permissions change
   * so the effective permissions are re-resolved on the next authenticated
   * request, whichever user holds the role.
   */
  invalidateAllUserCaches(): void {
    this.eventEmitter.emit('cache.invalidate.user', { pattern: 'cache:user:*' });
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

  /**
   * Resolves the effective permissions of an arbitrary user: the role's
   * permissions as base, the user's explicit permissions additive, deduplicated.
   * Same rule as `AuthService.withEffectivePermissions`, so the
   * result is coherent with what `/auth/me` would return for this user.
   *
   * A role that does not resolve (unknown name, empty `permissionIds`)
   * contributes nothing; the explicit grants still apply. Never throws for a
   * role without permissions — returns an empty list instead.
   */
  async getEffectivePermissions(user: Pick<User, 'role' | 'permissions'>): Promise<string[]> {
    const role = await this.roleModel.findOne({ name: user.role }).lean().exec();
    const rolePermissions = (role?.permissionIds as string[] | undefined) ?? [];
    return mergeEffectivePermissions(rolePermissions, user.permissions ?? []);
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

  /**
   * Regenerates the email-verification token of an admin-managed user and
   * emits the resend-verification email event with the plaintext token.
   *
   * A user without `emailVerificationToken` is already verified (that absence
   * is exactly what `AdminUserDTO.emailVerified` reports), so a resend is a
   * client mistake and answers 400 without emitting anything.
   *
   * @throws DomainError USER_NOT_FOUND for an unknown id, VALIDATION_ERROR when
   * the email is already verified.
   *
   * Side effect: writes the new token to the user document and sends the
   * verification email via the `auth.resend-verification` event.
   */
  async adminResendVerification(id: string, lang?: string): Promise<void> {
    const user = await this.findById(id);

    if (!user.emailVerificationToken) {
      throw DomainError.fromKind('VALIDATION_ERROR', {
        message: 'Email already verified',
      });
    }

    const verificationToken = randomUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.update(id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    this.eventEmitter.emit(EmailEvents.RESEND_VERIFICATION, {
      userId: id,
      email: user.email,
      name: user.name,
      verificationToken,
      lang,
    });
  }

  /**
   * Starts the password reset of an admin-managed user without knowing their
   * current password. The plaintext token is only ever delivered
   * through the FORGOT_PASSWORD email event, never returned over HTTP.
   *
   * @throws DomainError USER_NOT_FOUND for an unknown id.
   *
   * Side effect: writes a 24h reset token to the user document and sends the
   * reset email via the `auth.forgot-password` event.
   */
  async adminResetPassword(id: string, lang?: string): Promise<void> {
    const user = await this.findById(id);

    const resetToken = randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.update(id, {
      resetPasswordToken: resetToken,
      resetPasswordExpires: expires,
    });

    this.eventEmitter.emit(EmailEvents.FORGOT_PASSWORD, {
      userId: id,
      email: user.email,
      name: user.name,
      resetToken,
      lang,
    });
  }

  async findPaginated(filters: PaginationQueryDTO): Promise<PaginatedResponseDTO<AdminUserDTO>> {
    // The HTTP layer always hands a DTO with defaults, but the service is also a
    // public seam: without these fallbacks a partial filter turns totalPages into NaN.
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const { users, total } = await this.userRepository.findPaginated({
      page,
      limit,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      role: filters.role,
      isActive: filters.isActive,
      search: filters.search,
    });

    const data = users.map((user) => AdminUserDTO.of(user));
    return PaginatedResponseDTO.of(data, total, page, limit);
  }

  /**
   * Full filtered set for the CSV export (issue #455): same filters as the
   * paginated list, no page/limit. `page`/`limit` from the DTO are ignored.
   */
  async findAllFiltered(filters: PaginationQueryDTO): Promise<AdminUserDTO[]> {
    const users = await this.userRepository.findAllFiltered({
      sortBy: filters.sortBy ?? 'createdAt',
      sortOrder: filters.sortOrder ?? 'desc',
      role: filters.role,
      isActive: filters.isActive,
      search: filters.search,
    });
    return users.map((user) => AdminUserDTO.of(user));
  }

  /**
   * CSV document for the export endpoint (issue #455): one header row plus a
   * row per user, with exactly the fields of the admin DTO — never the
   * password or session state.
   */
  async exportUsersCsv(filters: PaginationQueryDTO): Promise<string> {
    const users = await this.findAllFiltered(filters);
    const rows = users.map((u) => [
      u.id,
      u.name,
      u.lastName,
      u.email,
      u.userName,
      u.role,
      u.isActive,
      u.createdAt ? new Date(u.createdAt).toISOString() : '',
      u.updatedAt ? new Date(u.updatedAt).toISOString() : '',
      u.lockedUntil,
      u.failedLoginAttempts,
    ]);
    return toCsv([...ADMIN_USER_CSV_HEADERS], rows);
  }

  async getMetrics(): Promise<UserMetrics> {
    return this.userRepository.aggregateMetrics();
  }

  /**
   * Validates, stores and references a profile photo (issues #539 and #546).
   * Size and format are decided from the payload itself, never from client
   * headers. The stored reference is the object key; the response carries the
   * public URL. The previous object is removed only after the new reference
   * is committed.
   */
  async updateProfilePhoto(
    userId: string,
    file: ProfilePhotoFile,
  ): Promise<Pick<User, 'avatarUrl'>> {
    if (file.size <= 0 || file.buffer.length === 0) {
      throw emptyProfilePhotoError();
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      throw DomainError.fromKind('PROFILE_PHOTO_TOO_LARGE');
    }

    const extension = await detectPhotoExtension(file);
    if (!extension) {
      throw DomainError.fromKind('INVALID_PROFILE_PHOTO_FORMAT');
    }

    const previous = (await this.userRepository.findById(userId))?.avatarUrl;

    let key: string | undefined;
    try {
      key = await this.photoStorage.save(userId, file.buffer, extension);
      const updated = await this.userRepository.update(userId, { avatarUrl: key });
      if (previous) {
        // Best effort: once the new reference committed, a failed removal of
        // the replaced object must not turn a successful update into an error.
        await this.photoStorage.delete(previous).catch(() => undefined);
      }
      return { avatarUrl: this.avatarUrlResolver.resolve(updated.avatarUrl) };
    } catch (error) {
      // Reaching here means the reference never committed, so the freshly
      // saved object is an orphan and the document still needs no cleanup.
      if (key) await this.photoStorage.delete(key);
      if (error instanceof Error && error.name === 'PhotoLimitExceededError') throw error;
      this.logger.error(
        `Failed to store profile photo for user ${userId}: ${error instanceof Error ? error.message : error}`,
      );
      throw DomainError.internal('Failed to store the profile photo');
    }
  }
}
