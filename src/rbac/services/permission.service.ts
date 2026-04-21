import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionCategory } from '../entities/permission.entity';

export const DEFAULT_PERMISSIONS = [
  // User permissions
  { name: 'user:create', description: 'Create users', category: PermissionCategory.USER },
  { name: 'user:read', description: 'Read users', category: PermissionCategory.USER },
  { name: 'user:update', description: 'Update users', category: PermissionCategory.USER },
  { name: 'user:delete', description: 'Delete users', category: PermissionCategory.USER },
  // Timer permissions
  { name: 'timer:create', description: 'Create timers', category: PermissionCategory.TIMER },
  { name: 'timer:read', description: 'Read timers', category: PermissionCategory.TIMER },
  { name: 'timer:update', description: 'Update timers', category: PermissionCategory.TIMER },
  { name: 'timer:delete', description: 'Delete timers', category: PermissionCategory.TIMER },
  // Organization permissions
  { name: 'organization:read', description: 'Read organizations', category: PermissionCategory.ORGANIZATION },
  { name: 'organization:update', description: 'Update organizations', category: PermissionCategory.ORGANIZATION },
  // Integration permissions
  { name: 'integration:read', description: 'Read integrations', category: PermissionCategory.INTEGRATION },
  // Statistics permissions
  { name: 'statistics:read', description: 'Read statistics', category: PermissionCategory.STATISTICS },
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
