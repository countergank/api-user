import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PermissionService } from './permission.service';
import { Permission, PermissionCategory } from '../entities/permission.entity';
import { CacheService } from '../../config/cache';

describe(PermissionService.name, () => {
  let service: PermissionService;

  const mockPermissionModel = {
    find: jest.fn(),
    findOne: jest.fn(),
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

  const mockPermDoc = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      _id: { toString: () => 'perm-id-1' },
      name: 'user:read',
      description: 'Read users',
      category: PermissionCategory.USER,
      isSystem: true,
      isActive: true,
      ...overrides,
    }) as unknown as Permission;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: getModelToken(Permission.name), useValue: mockPermissionModel },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`${PermissionService.name}.findAll`, () => {
    it('should return permissions from database on cache miss', async () => {
      const perms = [mockPermDoc(), mockPermDoc({ name: 'user:write' })];
      mockCacheService.get.mockResolvedValue(undefined);
      mockPermissionModel.find.mockReturnValue(mockExec(perms));

      const result = await service.findAll();

      expect(result).toEqual(perms);
      expect(mockPermissionModel.find).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rbac:permissions:all',
        perms,
        900_000,
      );
    });

    it('should return permissions from cache on cache hit', async () => {
      const cachedPerms = [mockPermDoc(), mockPermDoc({ name: 'user:write' })];
      mockCacheService.get.mockResolvedValue(cachedPerms);

      const result = await service.findAll();

      expect(result).toEqual(cachedPerms);
      expect(mockPermissionModel.find).not.toHaveBeenCalled();
    });

    it('should fall back to database when cache get throws', async () => {
      const perms = [mockPermDoc()];
      mockCacheService.get.mockRejectedValue(new Error('Redis timeout'));
      mockPermissionModel.find.mockReturnValue(mockExec(perms));

      const result = await service.findAll();

      expect(result).toEqual(perms);
      expect(mockPermissionModel.find).toHaveBeenCalled();
    });
  });

  describe(`${PermissionService.name}.findByNames`, () => {
    it('should return all permissions from individual name caches', async () => {
      const names = ['user:read', 'user:write'];
      const readPerm = mockPermDoc({ name: 'user:read' });
      const writePerm = mockPermDoc({ name: 'user:write' });

      mockCacheService.get
        .mockResolvedValueOnce(readPerm)
        .mockResolvedValueOnce(writePerm);

      const result = await service.findByNames(names);

      expect(result).toEqual([readPerm, writePerm]);
      expect(mockPermissionModel.find).not.toHaveBeenCalled();
    });

    it('should query DB only for missing names on partial cache miss', async () => {
      const names = ['user:read', 'user:write', 'user:delete'];
      const readPerm = mockPermDoc({ name: 'user:read' });
      const writePerm = mockPermDoc({ name: 'user:write' });
      const deletePerm = mockPermDoc({ name: 'user:delete' });

      // user:read cached, user:write and user:delete not
      mockCacheService.get
        .mockResolvedValueOnce(readPerm)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockPermissionModel.find.mockReturnValue(mockExec([writePerm, deletePerm]));

      const result = await service.findByNames(names);

      expect(result).toHaveLength(3);
      expect(result).toEqual([readPerm, writePerm, deletePerm]);
      expect(mockPermissionModel.find).toHaveBeenCalledWith({ name: { $in: ['user:write', 'user:delete'] } });
    });

    it('should query DB for all names on full miss and cache individually', async () => {
      const names = ['user:read', 'user:write'];
      const readPerm = mockPermDoc({ name: 'user:read' });
      const writePerm = mockPermDoc({ name: 'user:write' });

      mockCacheService.get
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockPermissionModel.find.mockReturnValue(mockExec([readPerm, writePerm]));

      const result = await service.findByNames(names);

      expect(result).toEqual([readPerm, writePerm]);
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:permissions:name:user:read', readPerm, 900_000);
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:permissions:name:user:write', writePerm, 900_000);
    });

    it('should return empty array for empty input without querying DB', async () => {
      const result = await service.findByNames([]);

      expect(result).toEqual([]);
      expect(mockPermissionModel.find).not.toHaveBeenCalled();
    });

    it('should handle cache get failure for one name and continue with others', async () => {
      const names = ['user:read', 'user:write'];
      const readPerm = mockPermDoc({ name: 'user:read' });
      const writePerm = mockPermDoc({ name: 'user:write' });

      mockCacheService.get
        .mockRejectedValueOnce(new Error('Redis timeout'))
        .mockResolvedValueOnce(writePerm);

      // user:read fell through to DB due to cache error
      mockPermissionModel.find.mockReturnValue(mockExec([readPerm]));

      const result = await service.findByNames(names);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(writePerm); // from cache
      expect(result).toContainEqual(readPerm);  // fell through to DB
      expect(mockPermissionModel.find).toHaveBeenCalledWith({ name: { $in: ['user:read'] } });
    });

    it('should cache individual permissions even when DB returns null for missing name', async () => {
      const names = ['user:read', 'nonexistent'];
      const readPerm = mockPermDoc({ name: 'user:read' });

      mockCacheService.get
        .mockResolvedValueOnce(undefined)  // user:read: miss
        .mockResolvedValueOnce(undefined); // nonexistent: miss

      mockPermissionModel.find.mockReturnValue(mockExec([readPerm]));

      const result = await service.findByNames(names);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(readPerm);
      expect(result[1]).toBeNull();
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:permissions:name:user:read', readPerm, 900_000);
      expect(mockCacheService.set).toHaveBeenCalledWith('rbac:permissions:name:nonexistent', null, 900_000);
    });
  });

  describe(`${PermissionService.name}.findByName`, () => {
    it('should return permission from database on cache miss', async () => {
      const perm = mockPermDoc({ name: 'user:read' });
      mockCacheService.get.mockResolvedValue(undefined);
      mockPermissionModel.findOne.mockReturnValue(mockExec(perm));

      const result = await service.findByName('user:read');

      expect(result).toEqual(perm);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rbac:permissions:name:user:read',
        perm,
        900_000,
      );
    });

    it('should return permission from cache on cache hit', async () => {
      const cachedPerm = mockPermDoc({ name: 'user:read' });
      mockCacheService.get.mockResolvedValue(cachedPerm);

      const result = await service.findByName('user:read');

      expect(result).toEqual(cachedPerm);
      expect(mockPermissionModel.findOne).not.toHaveBeenCalled();
    });

    it('should cache null when permission not found in database', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockPermissionModel.findOne.mockReturnValue(mockExec(null));

      const result = await service.findByName('nonexistent');

      expect(result).toBeNull();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'rbac:permissions:name:nonexistent',
        null,
        900_000,
      );
    });

    it('should fall back to database when cache get throws', async () => {
      const perm = mockPermDoc({ name: 'user:read' });
      mockCacheService.get.mockRejectedValue(new Error('Redis timeout'));
      mockPermissionModel.findOne.mockReturnValue(mockExec(perm));

      const result = await service.findByName('user:read');

      expect(result).toEqual(perm);
      expect(mockPermissionModel.findOne).toHaveBeenCalled();
    });
  });

  describe(`${PermissionService.name}.create`, () => {
    it('should invalidate all permission cache entries after create', async () => {
      const mockInstance = {
        save: jest.fn().mockResolvedValue(mockPermDoc({ name: 'new:perm' })),
      };

      const module2: TestingModule = await Test.createTestingModule({
        providers: [
          PermissionService,
          {
            provide: getModelToken(Permission.name),
            useValue: Object.assign(
              jest.fn().mockImplementation(() => mockInstance),
              { find: mockPermissionModel.find, findOne: mockPermissionModel.findOne },
            ),
          },
          { provide: CacheService, useValue: mockCacheService },
        ],
      }).compile();

      const createService = module2.get<PermissionService>(PermissionService);
      await createService.create({ name: 'new:perm', description: 'New perm', category: PermissionCategory.USER });

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('rbac:permissions:name:*');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:permissions:all');
    });
  });

  describe(`${PermissionService.name}.createMany`, () => {
    it('should invalidate all permission cache entries after createMany', async () => {
      mockPermissionModel.insertMany.mockResolvedValue([mockPermDoc({ name: 'perm:1' })]);

      await service.createMany([
        { name: 'perm:1', description: 'Perm 1', category: PermissionCategory.USER },
      ]);

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('rbac:permissions:name:*');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:permissions:all');
    });
  });
});
