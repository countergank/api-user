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

      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:roles:all');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:roles:name:admin');
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
