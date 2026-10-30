import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { DomainError } from '../../common/errors/domain.error';
import { escapeRegExp, isLocal } from '../../common/utils';
import { EncodeService } from '../../encode/encode.service';
import { SORTABLE_FIELDS } from '../dto/pagination-query.dto';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class UserRepository implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserRepository.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly encodeService: EncodeService,
  ) {}

  onApplicationBootstrap() {
    if (isLocal()) {
      this.populateUsers().catch((error) => this.logger.error(error));
    }
  }

  private async populateUsers(): Promise<User> {
    try {
      return await this.createWithRole({
        name: 'User',
        lastName: 'Root',
        email: 'countergank.ti@gmail.com',
        userName: 'root',
        password: 'password',
        role: UserRole.ADMIN,
        permissions: ['*'],
        isActive: true,
      });
    } catch (error) {
      this.logger.error(error);
      throw DomainError.fromKind('INTERNAL', { message: 'Failed to populate root user' });
    }
  }

  async existsByName(name: string): Promise<boolean> {
    const exists = await this.userModel.exists({ userName: name }).exec();
    return Boolean(exists);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const exists = await this.userModel.exists({ email }).exec();
    return Boolean(exists);
  }

  async existsByEmailExcludingSelf(email: string, excludeId: string): Promise<boolean> {
    const exists = await this.userModel.exists({ email, _id: { $ne: excludeId } }).exec();
    return Boolean(exists);
  }

  async existsByNameExcludingSelf(name: string, excludeId: string): Promise<boolean> {
    const exists = await this.userModel.exists({ userName: name, _id: { $ne: excludeId } }).exec();
    return Boolean(exists);
  }

  async create(user: User): Promise<User> {
    user.password = this.encodeService.hash(user.password);
    const newUser = new this.userModel(user);
    return newUser.save();
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
    const user = new this.userModel({
      ...data,
      password: this.encodeService.hash(data.password),
    });
    return user.save();
  }

  async findById(id: string, opts?: { includePassword?: boolean }): Promise<User | null> {
    const query = this.userModel.findById(id);
    if (opts?.includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findByEmail(email: string, opts?: { includePassword?: boolean }): Promise<User | null> {
    const query = this.userModel.findOne({ email });
    if (opts?.includePassword) {
      query.select('+password');
    }
    return query.exec();
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userModel
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      })
      .exec();
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.userModel
      .findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      })
      .exec();
  }

  async findByPendingEmailToken(token: string): Promise<User | null> {
    return this.userModel
      .findOne({
        pendingEmailToken: token,
        pendingEmailExpires: { $gt: new Date() },
      })
      .exec();
  }

  /**
   * Finds the user holding the revert token, regardless of the window (S5).
   *
   * Expiry is deliberately not part of the query: the caller has to tell an
   * expired window (410) from an unknown token (401) and from an already
   * reverted change (200, idempotent — S6).
   */
  async findByEmailRevertToken(token: string): Promise<User | null> {
    return this.userModel.findOne({ emailRevertToken: token }).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findIdsByRole(role: UserRole): Promise<string[]> {
    const users = await this.userModel.find({ role }).select('_id').exec();
    return users.map((user) => user._id.toString());
  }

  /**
   * @param session — optional transaction session; without it the write commits
   * on its own.
   */
  async update(id: string, data: Partial<User>, session?: ClientSession): Promise<User> {
    // If password is being updated, use save() to trigger pre-save hooks for hashing
    if (data.password) {
      const query = this.userModel.findById(id);
      if (session) {
        query.session(session);
      }
      const user = await query.exec();
      if (!user) {
        throw DomainError.fromKind('USER_NOT_FOUND', { message: `User ${id} not found` });
      }
      user.set(data);
      return user.save({ session });
    }

    // Filter out undefined values — Mongoose findByIdAndUpdate ignores them,
    // which is the correct behavior: undefined means "don't touch this field."
    // Callers that need to explicitly remove fields should use unsetFields().
    const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));

    return this.userModel.findByIdAndUpdate(id, defined, { new: true, session }).exec();
  }

  /**
   * Atomically increments the durable session epoch (S16/S17).
   *
   * `$inc` is applied by the server, so concurrent bumps stay monotonic instead
   * of overwriting each other with a stale read-modify-write value. Pass the
   * transaction `session` so the bump commits together with the credential
   * change it must invalidate.
   *
   * @returns the updated user, or `null` when the document does not exist.
   */
  async bumpSessionEpoch(id: string, session?: ClientSession): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, { $inc: { sessionEpoch: 1 } }, { new: true, session }).exec();
  }

  /**
   * Explicitly remove fields from a user document (uses MongoDB $unset).
   * Use when you need to actually delete fields, not just skip them.
   */
  async unsetFields(id: string, fields: string[], session?: ClientSession): Promise<User> {
    const $unset = Object.fromEntries(fields.map((f) => [f, 1]));
    return this.userModel.findByIdAndUpdate(id, { $unset }, { new: true, session }).exec();
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return this.encodeService.compare(password, hashedPassword);
  }

  async findPaginated(filters: {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: string;
    role?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<{ users: User[]; total: number }> {
    const mongoFilter: Record<string, unknown> = {};
    const andConditions: Record<string, unknown>[] = [];

    if (filters.role) {
      andConditions.push({ role: filters.role });
    }
    if (filters.isActive !== undefined) {
      andConditions.push({ isActive: filters.isActive });
    } else {
      // Default: exclude soft-deleted users when no isActive filter is specified
      mongoFilter.deletedAt = { $exists: false };
    }
    if (filters.search) {
      // COU-347: the console topbar sends `@userName`. The `@` ADDS a userName lookup with the `@`
      // stripped; it never narrows the four-field search, because a term starting with `@` is also
      // a piece of an email (`@example.com`) and that has to keep matching.
      const term = filters.search.trim();
      const fields = ['name', 'lastName', 'email', 'userName'] as const;
      const or: Record<string, unknown>[] = fields.map((field) => ({
        [field]: new RegExp(escapeRegExp(term), 'i'),
      }));

      if (term.startsWith('@') && term.length > 1) {
        or.push({ userName: new RegExp(escapeRegExp(term.slice(1)), 'i') });
      }

      andConditions.push({ $or: or });
    }

    if (andConditions.length > 0) {
      mongoFilter.$and = andConditions;
    }

    const sortBy = SORTABLE_FIELDS.includes(filters.sortBy) ? filters.sortBy : 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const skip = (filters.page - 1) * filters.limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(mongoFilter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(filters.limit)
        .exec(),
      this.userModel.countDocuments(mongoFilter).exec(),
    ]);

    return { users, total };
  }

  async softDelete(id: string): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, { isActive: false, deletedAt: new Date() }, { new: true }).exec();
  }
}
