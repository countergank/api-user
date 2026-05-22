import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../entities/role.entity';
import { UserRole } from '../../user/entities/user.entity';
import { AuditAction } from '../../common/audit/audit.decorator';

// ── Default permissions per role ──────────────────────
export const ADMIN_PERMISSIONS = ['*'];

export const USER_PERMISSIONS = ['user:read', 'user:update'];

export const VIEWER_PERMISSIONS = ['user:read'];
// ───────────────────────────────────────────────────────

export const DEFAULT_ROLES = [
  {
    name: UserRole.ADMIN,
    description: 'Administrator with full access',
    permissionIds: ADMIN_PERMISSIONS,
    isSystem: true,
    isDefault: false,
  },
  {
    name: UserRole.USER,
    description: 'Standard user with basic permissions',
    permissionIds: USER_PERMISSIONS,
    isSystem: true,
    isDefault: true,
  },
  {
    name: UserRole.VIEWER,
    description: 'Read-only user',
    permissionIds: VIEWER_PERMISSIONS,
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

  @AuditAction({
    action: 'role.create',
    resource: 'role',
    getResourceId: (result) => (result as Role)._id.toString(),
    getAfter: (result) => {
      const r = result as Role;
      return { roleId: r._id.toString(), name: r.name };
    },
  })
  async create(roleData: Partial<Role>): Promise<Role> {
    const role = new this.roleModel(roleData);
    return role.save();
  }

  @AuditAction({
    action: 'role.update-permissions',
    resource: 'role',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => ({ roleId: args[0] }),
    getAfter: (result) => {
      const r = result as Role | null;
      if (!r) return undefined;
      return { roleId: r._id.toString(), permissionCount: r.permissionIds?.length ?? 0 };
    },
  })
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
