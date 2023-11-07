import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomLogger } from '../common/logger';
import { isLocal } from '../common/utils';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository implements OnApplicationBootstrap {
  private readonly logger = new CustomLogger(UserRepository.name);
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  onApplicationBootstrap() {
    if (isLocal()) {
      this.populateUsers().catch((error) => this.logger.error(error));
    }
  }

  private async populateUsers(): Promise<User> {
    const newUser = await new this.userModel({
      name: 'countergank',
      lastName: 'countergank',
      email: 'countergank.ti@gmail.com',
      userName: 'countergank',
      password: 'administrator',
    });
    return newUser.save();
  }

  async existsByUsername(userName: string): Promise<boolean> {
    const exists = await this.userModel.exists({ userName }).exec();
    return Boolean(exists);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const exists = await this.userModel.exists({ email }).exec();
    return Boolean(exists);
  }

  async create(user: User): Promise<User> {
    const newUser = new this.userModel(user);
    return newUser.save();
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
