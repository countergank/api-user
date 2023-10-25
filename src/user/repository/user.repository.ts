import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../entities/user.entity';

@Injectable()
export class UserRepository {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async countByUserName(userName: string): Promise<number> {
    return this.userModel.count({ userName });
  }

  async create(user: User): Promise<User> {
    const createdCat = new this.userModel(user);
    return createdCat.save();
  }

  async findByUserName(userName: string): Promise<User> {
    return this.userModel.findOne({ userName }).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
