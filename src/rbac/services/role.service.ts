import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../entities/role.entity';
import { UserRole } from '../../user/entities/user.entity';

export const DEFAULT_ROLES = [
  {
    name: UserRole.ADMIN,
    description: 'Administrator with full access',
    permissionIds: ['*'], // Wildcard for all
    isSystem: true,
    isDefault: false,
  },
  {
    name: UserRole.USER,
    description: 'Standard user with basic permissions',
    permissionIds: ['user:read', 'timer:create', 'timer:read', 'timer:update'],
    isSystem: true,
    isDefault: true,
  },
  {
    name: UserRole.VIEWER,
    description: 'Read-only user',
    permissionIds: ['user:read', 'timer:read', 'organization:read', 'integration:read', 'statistics:read'],
    isSystem: true,
    isDefault: false,
  },
];

@Injectable()
export class RoleService {
  constructor(@InjectModel(Role.name) private roleModel: Model<Role>) {}

  async findAll(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleModel.findOne({ name }).exec();
  }

  async findByNames(names: string[]): Promise<Role[]> {
    return this.roleModel.find({ name: { $in: names } }).exec();
  }

  async findById(id: string): Promise<Role | null> {
    return this.roleModel.findById(id).exec();
  }

  async create(roleData: Partial<Role>): Promise<Role> {
    const role = new this.roleModel(roleData);
    return role.save();
  }

  async updatePermissions(roleId: string, permissionIds: string[]): Promise<Role | null> {
    return this.roleModel.findByIdAndUpdate(roleId, { permissionIds }, { new: true }).exec();
  }

  async seedDefaultRoles(): Promise<void> {
    const existing = await this.roleModel.countDocuments();
    if (existing > 0) {
      return;
    }
    await this.roleModel.insertMany(DEFAULT_ROLES);
  }

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const role = await this.findByName(roleName);
    if (!role) {
      return [];
    }
    return role.permissionIds || [];
  }
}
