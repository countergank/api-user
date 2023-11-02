import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async existsByUsername(userName: string): Promise<boolean> {
    const exists = await this.userModel.exists({ userName }).exec();
    return Boolean(exists);
  }

  async create(user: User): Promise<User> {
    const createdCat = new this.userModel(user);
    return createdCat.save();
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
