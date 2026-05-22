import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionCategory } from '../entities/permission.entity';
import { AuditAction } from '../../common/audit/audit.decorator';

export const DEFAULT_PERMISSIONS = [
  { name: 'user:create', description: 'Create users', category: PermissionCategory.USER },
  { name: 'user:read', description: 'Read users', category: PermissionCategory.USER },
  { name: 'user:update', description: 'Update users', category: PermissionCategory.USER },
  { name: 'user:delete', description: 'Delete users', category: PermissionCategory.USER },
  { name: 'role:create', description: 'Create roles', category: PermissionCategory.SYSTEM },
  { name: 'role:read', description: 'Read roles', category: PermissionCategory.SYSTEM },
  { name: 'role:update', description: 'Update roles', category: PermissionCategory.SYSTEM },
  { name: 'role:delete', description: 'Delete roles', category: PermissionCategory.SYSTEM },
  { name: 'permission:create', description: 'Create permissions', category: PermissionCategory.SYSTEM },
  { name: 'permission:read', description: 'Read permissions', category: PermissionCategory.SYSTEM },
  { name: 'permission:update', description: 'Update permissions', category: PermissionCategory.SYSTEM },
  { name: 'permission:delete', description: 'Delete permissions', category: PermissionCategory.SYSTEM },
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

  @AuditAction({
    action: 'permission.create',
    resource: 'permission',
    getResourceId: (result) => (result as Permission)._id.toString(),
    getAfter: (result) => {
      const p = result as Permission;
      return { permissionId: p._id.toString(), name: p.name };
    },
  })
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
