import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomLogger } from '../../common/logger';
import { isLocal } from '../../common/utils';
import { EncodeService } from '../../encode/encode.service';
import { User, UserRole } from '../entities/user.entity';
import { UserPopulateError } from '../errors/error-instances.error';
import { SORTABLE_FIELDS } from '../dto/pagination-query.dto';

@Injectable()
export class UserRepository implements OnApplicationBootstrap {
  private readonly logger = new CustomLogger(UserRepository.name);
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
      return this.createWithRole({
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
      throw new UserPopulateError(error);
    }
  }

  async existsByName(name: string): Promise<boolean> {
    const exists = await this.userModel.exists({ name }).exec();
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
    const exists = await this.userModel.exists({ name, _id: { $ne: excludeId } }).exec();
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

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
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

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    // If password is being updated, use save() to trigger pre-save hooks for hashing
    if (data.password) {
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new Error(`User ${id} not found`);
      }
      user.set(data);
      return user.save();
    }
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
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
      const searchRegex = new RegExp(filters.search, 'i');
      andConditions.push({
        $or: [
          { name: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { userName: searchRegex },
        ],
      });
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
    return this.userModel
      .findByIdAndUpdate(id, { isActive: false, deletedAt: new Date() }, { new: true })
      .exec();
  }
}
