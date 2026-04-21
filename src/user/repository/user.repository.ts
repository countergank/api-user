import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomLogger } from '../../common/logger';
import { isLocal } from '../../common/utils';
import { EncodeService } from '../../encode/encode.service';
import { User, UserRole } from '../entities/user.entity';
import { UserPopulateError } from '../errors/error-instances.error';

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

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return this.encodeService.compare(password, hashedPassword);
  }
}
