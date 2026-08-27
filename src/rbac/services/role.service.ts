import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../entities/role.entity';
import { UserRole } from '../../user/entities/user.entity';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CacheService } from '../../config/cache';

const ROLE_ALL_KEY = 'rbac:roles:all';
const ROLE_NAME_PREFIX = 'rbac:roles:name:';
const ROLE_TTL_MS = 600_000; // 10 minutes

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
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(): Promise<Role[]> {
    try {
      const cached = await this.cacheService.get<Role[]>(ROLE_ALL_KEY);
      if (cached !== undefined) return cached;
    } catch {
      this.logger.debug('Cache get failed for roles:all, falling back to DB');
    }

    const roles = await this.roleModel.find().exec();

    try {
      await this.cacheService.set(ROLE_ALL_KEY, roles, ROLE_TTL_MS);
    } catch {
      this.logger.debug('Cache set failed for roles:all');
    }

    return roles;
  }

  async findByName(name: string): Promise<Role | null> {
    const cacheKey = `${ROLE_NAME_PREFIX}${name}`;

    try {
      const cached = await this.cacheService.get<Role | null>(cacheKey);
      if (cached !== undefined) return cached;
    } catch {
      this.logger.debug(`Cache get failed for ${cacheKey}, falling back to DB`);
    }

    const role = await this.roleModel.findOne({ name }).exec();

    try {
      await this.cacheService.set(cacheKey, role, ROLE_TTL_MS);
    } catch {
      this.logger.debug(`Cache set failed for ${cacheKey}`);
    }

    return role;
  }

  async findByNames(names: string[]): Promise<Role[]> {
    if (names.length === 0) return [];

    const results: Role[] = [];
    const missingNames: string[] = [];

    // Check cache for each name individually
    for (const name of names) {
      const cacheKey = `${ROLE_NAME_PREFIX}${name}`;
      try {
        const cached = await this.cacheService.get<Role>(cacheKey);
        if (cached !== undefined) {
          results.push(cached);
          continue;
        }
      } catch {
        this.logger.debug(`Cache get failed for ${cacheKey}, treating as miss`);
      }
      missingNames.push(name);
    }

    // Query DB only for missing names
    if (missingNames.length > 0) {
      const dbRoles = await this.roleModel.find({ name: { $in: missingNames } }).exec();
      const dbRoleMap = new Map(dbRoles.map((r) => [r.name, r]));

      for (const name of missingNames) {
        const role = dbRoleMap.get(name) ?? null;
        results.push(role as Role);
        try {
          await this.cacheService.set(`${ROLE_NAME_PREFIX}${name}`, role, ROLE_TTL_MS);
        } catch {
          this.logger.debug(`Cache set failed for ${ROLE_NAME_PREFIX}${name}`);
        }
      }
    }

    return results;
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
    const saved = await role.save();

    try {
      await this.cacheService.delByPattern(`${ROLE_NAME_PREFIX}*`);
      await this.cacheService.del(ROLE_ALL_KEY);
    } catch {
      this.logger.debug('Cache invalidation failed after role create');
    }

    return saved;
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
    const updated = await this.roleModel.findByIdAndUpdate(roleId, { permissionIds }, { new: true }).exec();

    if (updated) {
      try {
        await this.cacheService.delByPattern('rbac:roles:*');
      } catch {
        this.logger.debug('Cache invalidation failed after updatePermissions');
      }
    }

    return updated;
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
