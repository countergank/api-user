import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionCategory } from '../entities/permission.entity';

export const DEFAULT_PERMISSIONS = [
  { name: 'user:create', description: 'Create users', category: PermissionCategory.USER },
  { name: 'user:read', description: 'Read users', category: PermissionCategory.USER },
  { name: 'user:update', description: 'Update users', category: PermissionCategory.USER },
  { name: 'user:delete', description: 'Delete users', category: PermissionCategory.USER },
];

@Injectable()
export class PermissionService {
  constructor(@InjectModel(Permission.name) private permissionModel: Model<Permission>) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionModel.find().exec();
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.permissionModel.find({ _id: { $in: ids } }).exec();
  }

  async findByNames(names: string[]): Promise<Permission[]> {
    return this.permissionModel.find({ name: { $in: names } }).exec();
  }

  async findByName(name: string): Promise<Permission | null> {
    return this.permissionModel.findOne({ name }).exec();
  }

  async create(permissionData: Partial<Permission>): Promise<Permission> {
    const permission = new this.permissionModel(permissionData);
    return permission.save();
  }

  async createMany(
    permissionsData: { name: string; description: string; category: PermissionCategory }[],
  ): Promise<Permission[]> {
    const result = await this.permissionModel.insertMany(permissionsData);
    return result as unknown as Permission[];
  }

  async seedDefaultPermissions(): Promise<void> {
    const existing = await this.permissionModel.countDocuments();
    if (existing > 0) {
      return;
    }
    await this.createMany(DEFAULT_PERMISSIONS);
  }
}
