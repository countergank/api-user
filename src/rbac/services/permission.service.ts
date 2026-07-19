import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission, PermissionCategory } from '../entities/permission.entity';
import { AuditAction } from '../../common/audit/audit.decorator';
import { CacheService } from '../../config/cache';

const PERM_ALL_KEY = 'rbac:permissions:all';
const PERM_NAME_PREFIX = 'rbac:permissions:name:';
const PERM_NAMES_PREFIX = 'rbac:permissions:names:';
const PERM_TTL_MS = 900_000; // 15 minutes

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
  private readonly logger = new Logger(PermissionService.name);

  constructor(
    @InjectModel(Permission.name) private permissionModel: Model<Permission>,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(): Promise<Permission[]> {
    try {
      const cached = await this.cacheService.get<Permission[]>(PERM_ALL_KEY);
      if (cached !== undefined) return cached;
    } catch {
      this.logger.debug('Cache get failed for permissions:all, falling back to DB');
    }

    const perms = await this.permissionModel.find().exec();

    try {
      await this.cacheService.set(PERM_ALL_KEY, perms, PERM_TTL_MS);
    } catch {
      this.logger.debug('Cache set failed for permissions:all');
    }

    return perms;
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    return this.permissionModel.find({ _id: { $in: ids } }).exec();
  }

  async findByNames(names: string[]): Promise<Permission[]> {
    const cacheKey = `${PERM_NAMES_PREFIX}${names.join(',')}`;

    try {
      const cached = await this.cacheService.get<Permission[]>(cacheKey);
      if (cached !== undefined) return cached;
    } catch {
      this.logger.debug(`Cache get failed for ${cacheKey}, falling back to DB`);
    }

    const perms = await this.permissionModel.find({ name: { $in: names } }).exec();

    try {
      await this.cacheService.set(cacheKey, perms, PERM_TTL_MS);
    } catch {
      this.logger.debug(`Cache set failed for ${cacheKey}`);
    }

    return perms;
  }

  async findByName(name: string): Promise<Permission | null> {
    const cacheKey = `${PERM_NAME_PREFIX}${name}`;

    try {
      const cached = await this.cacheService.get<Permission | null>(cacheKey);
      if (cached !== undefined) return cached;
    } catch {
      this.logger.debug(`Cache get failed for ${cacheKey}, falling back to DB`);
    }

    const perm = await this.permissionModel.findOne({ name }).exec();

    try {
      await this.cacheService.set(cacheKey, perm, PERM_TTL_MS);
    } catch {
      this.logger.debug(`Cache set failed for ${cacheKey}`);
    }

    return perm;
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
    const saved = await permission.save();

    try {
      await this.cacheService.delByPattern(`${PERM_NAME_PREFIX}*`);
      await this.cacheService.delByPattern(`${PERM_NAMES_PREFIX}*`);
      await this.cacheService.del(PERM_ALL_KEY);
    } catch {
      this.logger.debug('Cache invalidation failed after permission create');
    }

    return saved;
  }

  async createMany(
    permissionsData: { name: string; description: string; category: PermissionCategory }[],
  ): Promise<Permission[]> {
    const result = await this.permissionModel.insertMany(permissionsData);

    try {
      await this.cacheService.delByPattern(`${PERM_NAME_PREFIX}*`);
      await this.cacheService.delByPattern(`${PERM_NAMES_PREFIX}*`);
      await this.cacheService.del(PERM_ALL_KEY);
    } catch {
      this.logger.debug('Cache invalidation failed after permission createMany');
    }

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
