import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RoleService } from './role.service';
import { Role } from '../entities/role.entity';
import { CacheService } from '../../config/cache';

describe(RoleService.name, () => {
  let service: RoleService;

  const mockRoleModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(0),
  };

  const mockExec = (data: unknown) => ({ exec: jest.fn().mockResolvedValue(data) });

  const mockRoleDoc = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      _id: { toString: () => 'role-id-1' },
      name: 'admin',
      description: 'Admin role',
      permissionIds: ['*'],
      isSystem: true,
      isDefault: false,
      ...overrides,
    }) as unknown as Role;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getModelToken(Role.name), useValue: mockRoleModel },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`${RoleService.name}.findAll`, () => {
    it('should return roles from database on cache miss', async () => {
      const roles = [mockRoleDoc(), mockRoleDoc({ name: 'user' })];
      mockCacheService.get.mockResolvedValue(undefined);
      mockRoleModel.find.mockReturnValue(mockExec(roles));

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(mockRoleModel.find).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rbac:roles:all',
        roles,
        600_000,
      );
    });

    it('should return roles from cache on cache hit', async () => {
      const cachedRoles = [mockRoleDoc(), mockRoleDoc({ name: 'user' })];
      mockCacheService.get.mockResolvedValue(cachedRoles);

      const result = await service.findAll();

      expect(result).toEqual(cachedRoles);
      expect(mockRoleModel.find).not.toHaveBeenCalled();
    });

    it('should fall back to database when cache get throws', async () => {
      const roles = [mockRoleDoc()];
      mockCacheService.get.mockRejectedValue(new Error('Redis timeout'));
      mockRoleModel.find.mockReturnValue(mockExec(roles));

      const result = await service.findAll();

      expect(result).toEqual(roles);
      expect(mockRoleModel.find).toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.findByName`, () => {
    it('should return role from database on cache miss', async () => {
      const role = mockRoleDoc({ name: 'admin' });
      mockCacheService.get.mockResolvedValue(undefined);
      mockRoleModel.findOne.mockReturnValue(mockExec(role));

      const result = await service.findByName('admin');

      expect(result).toEqual(role);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rbac:roles:name:admin',
        role,
        600_000,
      );
    });

    it('should return role from cache on cache hit', async () => {
      const cachedRole = mockRoleDoc({ name: 'admin' });
      mockCacheService.get.mockResolvedValue(cachedRole);

      const result = await service.findByName('admin');

      expect(result).toEqual(cachedRole);
      expect(mockRoleModel.findOne).not.toHaveBeenCalled();
    });

    it('should cache null when role not found in database', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockRoleModel.findOne.mockReturnValue(mockExec(null));

      const result = await service.findByName('nonexistent');

      expect(result).toBeNull();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rbac:roles:name:nonexistent',
        null,
        600_000,
      );
    });

    it('should fall back to database when cache get throws', async () => {
      const role = mockRoleDoc({ name: 'admin' });
      mockCacheService.get.mockRejectedValue(new Error('Redis timeout'));
      mockRoleModel.findOne.mockReturnValue(mockExec(role));

      const result = await service.findByName('admin');

      expect(result).toEqual(role);
      expect(mockRoleModel.findOne).toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.findByNames`, () => {
    it('should return all roles from cache when all names are cached', async () => {
      const names = ['admin', 'user'];
      const adminRole = mockRoleDoc({ name: 'admin' });
      const userRole = mockRoleDoc({ name: 'user', _id: { toString: () => 'role-id-2' } });

      mockCacheService.get
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(userRole);

      const result = await service.findByNames(names);

      expect(result).toEqual([adminRole, userRole]);
      expect(mockRoleModel.find).not.toHaveBeenCalled();
    });

    it('should query DB only for missing names on partial cache miss', async () => {
      const names = ['admin', 'user', 'viewer'];
      const adminRole = mockRoleDoc({ name: 'admin' });
      const userRole = mockRoleDoc({ name: 'user', _id: { toString: () => 'role-id-2' } });
      const viewerRole = mockRoleDoc({ name: 'viewer', _id: { toString: () => 'role-id-3' } });

      // admin cached, user and viewer not
      mockCacheService.get
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockRoleModel.find.mockReturnValue(mockExec([userRole, viewerRole]));

      const result = await service.findByNames(names);

      expect(result).toHaveLength(3);
      expect(result).toEqual([adminRole, userRole, viewerRole]);
      expect(mockRoleModel.find).toHaveBeenCalledWith({ name: { $in: ['user', 'viewer'] } });
    });

    it('should query DB for all names and cache results on full miss', async () => {
      const names = ['admin', 'user'];
      const adminRole = mockRoleDoc({ name: 'admin' });
      const userRole = mockRoleDoc({ name: 'user', _id: { toString: () => 'role-id-2' } });

      mockCacheService.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockRoleModel.find.mockReturnValue(mockExec([adminRole, userRole]));

      const result = await service.findByNames(names);

      expect(result).toEqual([adminRole, userRole]);
      expect(mockRoleModel.find).toHaveBeenCalledWith({ name: { $in: ['admin', 'user'] } });
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:roles:name:admin', adminRole, 600_000);
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:roles:name:user', userRole, 600_000);
    });

    it('should return empty array for empty input without querying DB', async () => {
      const result = await service.findByNames([]);

      expect(result).toEqual([]);
      expect(mockRoleModel.find).not.toHaveBeenCalled();
    });

    it('should cache individual roles even when findByNames returns partial results', async () => {
      const names = ['admin', 'nonexistent'];
      const adminRole = mockRoleDoc({ name: 'admin' });

      mockCacheService.get
        .mockResolvedValueOnce(undefined)  // admin: miss
        .mockResolvedValueOnce(undefined); // nonexistent: miss

      // DB returns only admin (nonexistent doesn't exist)
      mockRoleModel.find.mockReturnValue(mockExec([adminRole]));

      const result = await service.findByNames(names);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(adminRole);
      expect(result[1]).toBeNull();
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:roles:name:admin', adminRole, 600_000);
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:roles:name:nonexistent', null, 600_000);
    });

    it('should handle cache get failure for one name and continue with others', async () => {
      const names = ['admin', 'user'];
      const adminRole = mockRoleDoc({ name: 'admin' });
      const userRole = mockRoleDoc({ name: 'user', _id: { toString: () => 'role-id-2' } });

      mockCacheService.get
        .mockRejectedValueOnce(new Error('Redis timeout'))
        .mockResolvedValueOnce(userRole);

      // admin fell through to DB due to cache error
      mockRoleModel.find.mockReturnValue(mockExec([adminRole]));

      const result = await service.findByNames(names);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(userRole);   // from cache
      expect(result).toContainEqual(adminRole);  // fell through to DB
      expect(mockRoleModel.find).toHaveBeenCalledWith({ name: { $in: ['admin'] } });
    });
  });

  describe(`${RoleService.name}.create`, () => {
    it('should invalidate all role cache entries after create', async () => {
      const mockInstance = {
        save: jest.fn().mockResolvedValue(mockRoleDoc({ name: 'moderator' })),
      };

      // Override the roleModel constructor behavior for this test
      const ModuleWithMock = await Test.createTestingModule({
        providers: [
          RoleService,
          {
            provide: getModelToken(Role.name),
            useValue: Object.assign(
              jest.fn().mockImplementation(() => mockInstance),
              { find: mockRoleModel.find, findOne: mockRoleModel.findOne },
            ),
          },
          { provide: CacheService, useValue: mockCacheService },
        ],
      }).compile();

      const createService = ModuleWithMock.get<RoleService>(RoleService);
      await createService.create({ name: 'moderator', description: 'Moderator' });

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('rbac:roles:name:*');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:roles:all');
    });
  });

  describe(`${RoleService.name}.updatePermissions`, () => {
    it('should invalidate role cache after updatePermissions', async () => {
      const updatedRole = mockRoleDoc({ name: 'admin', permissionIds: ['user:read'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));

      await service.updatePermissions('role-id-1', ['user:read']);

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('rbac:roles:*');
    });

    it('should use delByPattern for role name keys on updatePermissions', async () => {
      const updatedRole = mockRoleDoc({ name: 'admin', permissionIds: ['user:read'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));

      await service.updatePermissions('role-id-1', ['user:read']);

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('rbac:roles:*');
    });

    it('should still update DB even if cache invalidation fails', async () => {
      const updatedRole = mockRoleDoc({ name: 'admin', permissionIds: ['user:read'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));
      mockCacheService.del.mockRejectedValue(new Error('Redis error'));

      const result = await service.updatePermissions('role-id-1', ['user:read']);

      expect(result).toEqual(updatedRole);
      expect(mockRoleModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });
});
