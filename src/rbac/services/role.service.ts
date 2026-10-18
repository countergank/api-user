import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { UserRole } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';
import { PermissionService } from './permission.service';
import { AuditAction } from '../../common/audit/audit.decorator';
import { DomainError } from '../../common/errors/domain.error';
import { CacheService } from '../../config/cache';
import { UpdateRoleDTO } from '../dto/update-role.dto';

const ROLE_ALL_KEY = 'rbac:roles:all';
const ROLE_NAME_PREFIX = 'rbac:roles:name:';
const ROLE_TTL_MS = 600_000; // 10 minutes

// ── Default permissions per role ──────────────────────
export const ADMIN_PERMISSIONS = ['*'];

/** Wildcard permission accepted by the catalog validator (the `admin` role uses it). */
export const WILDCARD_PERMISSION = '*';

/**
 * Data accepted by `RoleService.create`.
 *
 * `isSystem` is not part of the HTTP contract (`CreateRoleDTO` omits it); only
 * the seeder marks a role as system-defined.
 */
export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds?: string[];
  isSystem?: boolean;
  isDefault?: boolean;
}

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

/**
 * Resolves the effective permissions for a user.
 *
 * The role's permissions are the base (a user with no explicit permissions
 * inherits them); the user's own permissions are additive grants. The result
 * is deduplicated while preserving order — role permissions first, then any
 * additional explicit grants. A wildcard (`*`) is passed through unchanged.
 */
export function mergeEffectivePermissions(rolePermissions: string[], userPermissions: string[]): string[] {
  return [...new Set([...rolePermissions, ...userPermissions])];
}

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    @InjectModel(Role.name) private roleModel: Model<Role>,
    private readonly cacheService: CacheService,
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
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

  /**
   * Validates role permission ids against the existing permission catalog (S11, S13).
   *
   * The wildcard `*` is accepted as-is because the `admin` role is defined with it;
   * every other name must exist in the catalog. Validation lives in the service
   * (unlike users) because `RoleService` already has the catalog through
   * `PermissionService` in the same module, so every writer of `permissionIds`
   * (`create` and `updatePermissions`) goes through the same guard.
   *
   * @throws DomainError VALIDATION_ERROR (UA-COM-005) listing the rejected names.
   */
  async assertPermissionsExist(permissionIds: string[]): Promise<string[]> {
    const deduplicated = [...new Set(permissionIds ?? [])];
    if (deduplicated.length === 0) {
      return [];
    }

    const candidates = deduplicated.filter((permissionId) => permissionId !== WILDCARD_PERMISSION);
    const catalog =
      candidates.length > 0 ? await this.permissionService.findByNames(candidates) : [];
    const known = new Set(
      catalog.filter((permission): permission is Permission => Boolean(permission)).map((permission) => permission.name),
    );
    const rejected = deduplicated.filter(
      (permissionId) => permissionId !== WILDCARD_PERMISSION && !known.has(permissionId),
    );

    if (rejected.length > 0) {
      throw DomainError.fromKind('VALIDATION_ERROR', {
        message: `Unknown permissions: ${rejected.join(', ')}`,
      });
    }

    return deduplicated;
  }

  /**
   * Invalidates every role cache entry (list + per-name entries) after a write
   * that changes an existing role (S15).
   *
   * Best-effort: Redis is not the source of truth, so a failed invalidation only
   * delays the refresh and must not fail an already-applied write.
   */
  private async invalidateRoleCaches(operation: string): Promise<void> {
    try {
      await this.cacheService.delByPattern('cache:rbac:roles:*');
      await this.cacheService.del(ROLE_ALL_KEY);
    } catch {
      this.logger.debug(`Cache invalidation failed after ${operation}`);
    }
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
  async create(roleData: CreateRoleInput): Promise<Role> {
    const existing = await this.findByName(roleData.name);
    if (existing) {
      throw DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
    }

    const permissionIds = await this.assertPermissionsExist(roleData.permissionIds ?? []);

    const role = new this.roleModel({ ...roleData, permissionIds });
    const saved = await role.save();

    try {
      await this.cacheService.delByPattern('cache:rbac:roles:name:*');
      await this.cacheService.del(ROLE_ALL_KEY);
    } catch {
      this.logger.debug('Cache invalidation failed after role create');
    }

    return saved;
  }

  /**
   * Updates the name and/or description of a role (S2, S7).
   *
   * A system role cannot be renamed (S4, S9); its description stays editable
   * because the policy protects the identity of the seeded roles, not their
   * documentation.
   *
   * Renaming to a name that already belongs to another role is rejected with
   * `ENTITY_NAME_ALREADY_EXISTS` (S16), the same guard `create` uses: without it
   * the Mongo unique index surfaces as a raw 500 instead of a conflict.
   *
   * @throws DomainError ENTITY_NOT_FOUND when the role does not exist.
   * @throws DomainError FORBIDDEN (UA-SEC-002, 403) when renaming a system role.
   * @throws DomainError ENTITY_NAME_ALREADY_EXISTS (UA-COM-003, 409) on a name clash.
   */
  @AuditAction({
    action: 'role.update',
    resource: 'role',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => ({ roleId: args[0] }),
    getAfter: (result) => {
      const r = result as Role | null;
      if (!r) return undefined;
      return { roleId: r._id.toString(), name: r.name, description: r.description };
    },
  })
  async update(roleId: string, dto: UpdateRoleDTO): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }

    const isRename = dto.name !== undefined && dto.name !== role.name;
    if (role.isSystem && isRename) {
      throw DomainError.fromKind('FORBIDDEN', {
        message: 'System roles cannot be renamed',
      });
    }

    if (isRename) {
      const nameOwner = await this.findByName(dto.name as string);
      if (nameOwner && nameOwner._id.toString() !== role._id.toString()) {
        throw DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
      }
    }

    const changes: Partial<Role> = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.description !== undefined) changes.description = dto.description;

    const updated = await this.roleModel.findByIdAndUpdate(roleId, changes, { new: true }).exec();
    if (!updated) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }

    await this.invalidateRoleCaches('role update');

    return updated;
  }

  /**
   * Deletes a role (S3, S8).
   *
   * A system role is never deletable (S4, S9) and a role still assigned to users
   * is rejected with `ROLE_IN_USE` (S10, S14) so no user is left pointing at a
   * dangling role name. User documents are never touched (S15).
   *
   * @throws DomainError ENTITY_NOT_FOUND when the role does not exist.
   * @throws DomainError FORBIDDEN (UA-SEC-002, 403) for a system role.
   * @throws DomainError ROLE_IN_USE (UA-RBAC-001, 409) when users hold the role.
   */
  @AuditAction({
    action: 'role.delete',
    resource: 'role',
    getResourceId: (_result, args) => args[0] as string,
    getBefore: (...args) => ({ roleId: args[0] }),
    getAfter: (result) => {
      const r = result as Role | null;
      if (!r) return undefined;
      return { roleId: r._id.toString(), name: r.name };
    },
  })
  async remove(roleId: string): Promise<Role> {
    const role = await this.findById(roleId);
    if (!role) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }

    if (role.isSystem) {
      throw DomainError.fromKind('FORBIDDEN', {
        message: 'System roles cannot be deleted',
      });
    }

    const assignedUserIds = await this.userService.findIdsByRole(role.name as UserRole);
    if (assignedUserIds.length > 0) {
      throw DomainError.fromKind('ROLE_IN_USE', {
        message: `Role ${role.name} is assigned to ${assignedUserIds.length} user(s)`,
      });
    }

    const deleted = await this.roleModel.findByIdAndDelete(roleId).exec();
    if (!deleted) {
      throw DomainError.fromKind('ENTITY_NOT_FOUND');
    }

    await this.invalidateRoleCaches('role delete');

    return deleted;
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
    // A missing list must never be read as "clear every permission": the HTTP
    // boundary rejects it, and this guard protects any other caller.
    if (!Array.isArray(permissionIds)) {
      throw DomainError.fromKind('VALIDATION_ERROR', {
        message: 'permissionIds must be an array',
      });
    }

    const validatedPermissionIds = await this.assertPermissionsExist(permissionIds);
    const updated = await this.roleModel
      .findByIdAndUpdate(roleId, { permissionIds: validatedPermissionIds }, { new: true })
      .exec();

    if (updated) {
      try {
        await this.cacheService.delByPattern('cache:rbac:roles:*');
        await this.userService.invalidateUsersByRole(updated.name as UserRole);
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
