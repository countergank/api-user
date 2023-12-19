import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CustomLogger } from '../common/logger';
import { isLocal } from '../common/utils';
import { EncodeService } from '../encode/encode.service';
import { User } from './entities/user.entity';

@Injectable()
export class UserRepository implements OnApplicationBootstrap {
  private readonly logger = new CustomLogger(UserRepository.name);
  constructor(@InjectModel(User.name) private userModel: Model<User>, private readonly encodeService: EncodeService) {}

  onApplicationBootstrap() {
    if (isLocal()) {
      this.populateUsers().catch((error) => this.logger.error(error));
    }
  }

  private async populateUsers(): Promise<User> {
    return this.create({
      name: 'User',
      lastName: 'Root',
      email: 'countergank.ti@gmail.com',
      userName: 'root',
      password: 'password',
    });
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

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
