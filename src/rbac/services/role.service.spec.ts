import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RoleService, mergeEffectivePermissions } from './role.service';
import { Role } from '../entities/role.entity';
import { PermissionService } from './permission.service';
import { UserService } from '../../user/service/user.service';
import { CacheService } from '../../config/cache';

describe(RoleService.name, () => {
  let service: RoleService;

  const mockRoleModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(0),
  };

  const mockUserService = {
    invalidateUsersByRole: jest.fn().mockResolvedValue(undefined),
    findIdsByRole: jest.fn().mockResolvedValue([]),
  };

  const mockPermissionService = {
    findByNames: jest.fn().mockResolvedValue([]),
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

    // `resetAllMocks` clears the module-level defaults above, so re-arm the ones
    // the happy paths rely on (an empty permission catalog and no assigned users).
    mockCacheService.set.mockResolvedValue(undefined);
    mockCacheService.del.mockResolvedValue(undefined);
    mockCacheService.delByPattern.mockResolvedValue(0);
    mockUserService.invalidateUsersByRole.mockResolvedValue(undefined);
    mockUserService.findIdsByRole.mockResolvedValue([]);
    // Default catalog: every requested name exists. Tests about rejected names
    // override this with an explicit `[null]` answer.
    mockPermissionService.findByNames.mockImplementation((names: string[]) =>
      Promise.resolve(names.map((name) => ({ name }))),
    );
    mockRoleModel.findOne.mockReturnValue(mockExec(null));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getModelToken(Role.name), useValue: mockRoleModel },
        { provide: CacheService, useValue: mockCacheService },
        { provide: UserService, useValue: mockUserService },
        { provide: PermissionService, useValue: mockPermissionService },
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
      mockCacheService.get.mockResolvedValue(undefined);
      mockRoleModel.findOne.mockReturnValue(mockExec(null));

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
          { provide: UserService, useValue: mockUserService },
          { provide: PermissionService, useValue: mockPermissionService },
        ],
      }).compile();

      const createService = ModuleWithMock.get<RoleService>(RoleService);
      await createService.create({ name: 'moderator', description: 'Moderator' });

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('cache:rbac:roles:name:*');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:roles:all');
    });
  });

  describe(`${RoleService.name}.updatePermissions body guard`, () => {
    it('rejects a missing permissionIds array instead of clearing the role (S13)', async () => {
      await expect(service.updatePermissions('role-id-1', undefined as unknown as string[])).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({ kind: 'VALIDATION_ERROR', code: 'UA-COM-005' }),
        }),
      );

      expect(mockRoleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.updatePermissions`, () => {
    it('should invalidate role cache after updatePermissions', async () => {
      const updatedRole = mockRoleDoc({ name: 'admin', permissionIds: ['user:read'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));

      await service.updatePermissions('role-id-1', ['user:read']);

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('cache:rbac:roles:*');
    });

    it('should use the prefixed pattern for role keys on updatePermissions', async () => {
      const updatedRole = mockRoleDoc({ name: 'admin', permissionIds: ['user:read'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));

      await service.updatePermissions('role-id-1', ['user:read']);

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('cache:rbac:roles:*');
    });

    it('should invalidate the user cache of every user with the updated role', async () => {
      const updatedRole = mockRoleDoc({ name: 'user', permissionIds: ['user:read'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));

      await service.updatePermissions('role-id-1', ['user:read']);

      expect(mockUserService.invalidateUsersByRole).toHaveBeenCalledWith('user');
    });

    it('should not invalidate users when the role does not exist', async () => {
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(null));

      const result = await service.updatePermissions('missing-role', ['user:read']);

      expect(result).toBeNull();
      expect(mockUserService.invalidateUsersByRole).not.toHaveBeenCalled();
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

  describe(`${RoleService.name}.assertPermissionsExist`, () => {
    it('accepts the `*` wildcard without consulting the catalog', async () => {
      await expect(service.assertPermissionsExist(['*'])).resolves.toEqual(['*']);

      expect(mockPermissionService.findByNames).not.toHaveBeenCalled();
    });

    it('accepts permissions present in the catalog', async () => {
      mockPermissionService.findByNames.mockResolvedValue([
        { name: 'user:read' },
        { name: 'audit:read' },
      ]);

      await expect(service.assertPermissionsExist(['user:read', 'audit:read'])).resolves.toEqual([
        'user:read',
        'audit:read',
      ]);
      expect(mockPermissionService.findByNames).toHaveBeenCalledWith(['user:read', 'audit:read']);
    });

    it('accepts the wildcard mixed with catalog names', async () => {
      mockPermissionService.findByNames.mockResolvedValue([{ name: 'user:read' }]);

      await expect(service.assertPermissionsExist(['*', 'user:read'])).resolves.toEqual(['*', 'user:read']);
      expect(mockPermissionService.findByNames).toHaveBeenCalledWith(['user:read']);
    });

    it('rejects a permission missing from the catalog with VALIDATION_ERROR (S11, S13)', async () => {
      mockPermissionService.findByNames.mockResolvedValue([null]);

      await expect(service.assertPermissionsExist(['user:nope'])).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({
            kind: 'VALIDATION_ERROR',
            code: 'UA-COM-005',
            statusCode: 400,
          }),
        }),
      );
    });

    it('lists every rejected name in the error message', async () => {
      mockPermissionService.findByNames.mockResolvedValue([{ name: 'user:read' }, null]);

      await expect(service.assertPermissionsExist(['user:read', 'user:nope'])).rejects.toThrow(
        /Unknown permissions: user:nope/,
      );
    });

    it('deduplicates the accepted names preserving order', async () => {
      mockPermissionService.findByNames.mockResolvedValue([{ name: 'user:read' }]);

      await expect(service.assertPermissionsExist(['user:read', 'user:read'])).resolves.toEqual(['user:read']);
    });

    it('returns an empty list without querying the catalog for empty input', async () => {
      await expect(service.assertPermissionsExist([])).resolves.toEqual([]);

      expect(mockPermissionService.findByNames).not.toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.updatePermissions validation`, () => {
    it('rejects an unknown permission before touching the database (S13)', async () => {
      mockPermissionService.findByNames.mockResolvedValue([null]);

      await expect(service.updatePermissions('role-id-1', ['user:nope'])).rejects.toEqual(
        expect.objectContaining({ kind: expect.objectContaining({
          kind: 'VALIDATION_ERROR',
          code: 'UA-COM-005',
          statusCode: 400,
        }) }),
      );
      expect(mockRoleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('persists the wildcard permission used by the admin role', async () => {
      const updatedRole = mockRoleDoc({ name: 'admin', permissionIds: ['*'] });
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updatedRole));

      await service.updatePermissions('role-id-1', ['*']);

      expect(mockRoleModel.findByIdAndUpdate).toHaveBeenCalledWith('role-id-1', { permissionIds: ['*'] }, { new: true });
    });
  });

  describe(`${RoleService.name}.create validation`, () => {
    it('rejects a duplicate role name with ENTITY_NAME_ALREADY_EXISTS (S6)', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockRoleModel.findOne.mockReturnValue(mockExec(mockRoleDoc({ name: 'moderator' })));
      const save = jest.fn();
      const ModelCtor = Object.assign(jest.fn(), {
        find: mockRoleModel.find,
        findOne: mockRoleModel.findOne,
      });
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RoleService,
          { provide: getModelToken(Role.name), useValue: ModelCtor },
          { provide: CacheService, useValue: mockCacheService },
          { provide: UserService, useValue: mockUserService },
          { provide: PermissionService, useValue: mockPermissionService },
        ],
      }).compile();

      await expect(
        module.get<RoleService>(RoleService).create({ name: 'moderator', description: 'Moderator' }),
      ).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({
            kind: 'ENTITY_NAME_ALREADY_EXISTS',
            code: 'UA-COM-003',
            statusCode: 409,
          }),
        }),
      );
      expect(save).not.toHaveBeenCalled();
    });

    it('rejects permission ids missing from the catalog before saving (S11)', async () => {
      mockCacheService.get.mockResolvedValue(undefined);
      mockRoleModel.findOne.mockReturnValue(mockExec(null));
      mockPermissionService.findByNames.mockResolvedValue([null]);
      const save = jest.fn();
      const ModuleWithMock = await Test.createTestingModule({
        providers: [
          RoleService,
          {
            provide: getModelToken(Role.name),
            useValue: Object.assign(jest.fn().mockImplementation(() => ({ save })), {
              find: mockRoleModel.find,
              findOne: mockRoleModel.findOne,
            }),
          },
          { provide: CacheService, useValue: mockCacheService },
          { provide: UserService, useValue: mockUserService },
          { provide: PermissionService, useValue: mockPermissionService },
        ],
      }).compile();

      await expect(
        ModuleWithMock.get<RoleService>(RoleService).create({
          name: 'moderator',
          permissionIds: ['user:nope'],
        }),
      ).rejects.toEqual(
        expect.objectContaining({ kind: expect.objectContaining({ kind: 'VALIDATION_ERROR' }) }),
      );
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.update`, () => {
    it('updates name and description of a non-system role (S7)', async () => {
      const current = mockRoleDoc({ name: 'moderator', isSystem: false });
      const updated = mockRoleDoc({ name: 'moderator-v2', description: 'Renamed', isSystem: false });
      mockRoleModel.findById.mockReturnValue(mockExec(current));
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updated));

      const result = await service.update('role-id-1', { name: 'moderator-v2', description: 'Renamed' });

      expect(result).toEqual(updated);
      expect(mockRoleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'role-id-1',
        { name: 'moderator-v2', description: 'Renamed' },
        { new: true },
      );
    });

    it('invalidates the role caches after a successful update', async () => {
      mockRoleModel.findById.mockReturnValue(mockExec(mockRoleDoc({ name: 'moderator', isSystem: false })));
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(mockRoleDoc({ name: 'moderator-v2' })));

      await service.update('role-id-1', { name: 'moderator-v2' });

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('cache:rbac:roles:*');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:roles:all');
    });

    it('rejects renaming to an already-existing name with ENTITY_NAME_ALREADY_EXISTS (S16)', async () => {
      const current = mockRoleDoc({ name: 'moderator', isSystem: false });
      const conflicting = mockRoleDoc({ _id: { toString: () => 'role-id-2' }, name: 'viewer', isSystem: false });
      mockRoleModel.findById.mockReturnValue(mockExec(current));
      mockRoleModel.findOne.mockReturnValue(mockExec(conflicting));
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(conflicting));

      await expect(service.update('role-id-1', { name: 'viewer' })).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({
            kind: 'ENTITY_NAME_ALREADY_EXISTS',
            code: 'UA-COM-003',
            statusCode: 409,
          }),
        }),
      );
      expect(mockRoleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('does not consult the name catalog when the name is unchanged (S16)', async () => {
      const current = mockRoleDoc({ name: 'moderator', isSystem: false });
      mockRoleModel.findById.mockReturnValue(mockExec(current));
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(current));

      await expect(service.update('role-id-1', { name: 'moderator', description: 'Same name' })).resolves.toEqual(
        current,
      );
      expect(mockRoleModel.findOne).not.toHaveBeenCalled();
    });

    it('rejects renaming a system role with FORBIDDEN (S4, S9)', async () => {
      mockRoleModel.findById.mockReturnValue(mockExec(mockRoleDoc({ name: 'admin', isSystem: true })));

      await expect(service.update('role-id-1', { name: 'superadmin' })).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({
            kind: 'FORBIDDEN',
            code: 'UA-SEC-002',
            statusCode: 403,
          }),
        }),
      );
      expect(mockRoleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('allows updating only the description of a system role', async () => {
      const current = mockRoleDoc({ name: 'admin', isSystem: true });
      const updated = mockRoleDoc({ name: 'admin', description: 'Full access', isSystem: true });
      mockRoleModel.findById.mockReturnValue(mockExec(current));
      mockRoleModel.findByIdAndUpdate.mockReturnValue(mockExec(updated));

      await expect(service.update('role-id-1', { description: 'Full access' })).resolves.toEqual(updated);
    });

    it('throws ENTITY_NOT_FOUND for an unknown role id', async () => {
      mockRoleModel.findById.mockReturnValue(mockExec(null));

      await expect(service.update('missing', { name: 'whatever' })).rejects.toEqual(
        expect.objectContaining({ kind: expect.objectContaining({ kind: 'ENTITY_NOT_FOUND', statusCode: 404 }) }),
      );
      expect(mockRoleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.remove`, () => {
    it('deletes a non-system role without assigned users (S8)', async () => {
      const role = mockRoleDoc({ name: 'moderator', isSystem: false });
      mockRoleModel.findById.mockReturnValue(mockExec(role));
      mockRoleModel.findByIdAndDelete.mockReturnValue(mockExec(role));
      mockUserService.findIdsByRole.mockResolvedValue([]);

      await expect(service.remove('role-id-1')).resolves.toEqual(role);
      expect(mockUserService.findIdsByRole).toHaveBeenCalledWith('moderator');
      expect(mockRoleModel.findByIdAndDelete).toHaveBeenCalledWith('role-id-1');
    });

    it('invalidates role caches after deleting (S15)', async () => {
      const role = mockRoleDoc({ name: 'moderator', isSystem: false });
      mockRoleModel.findById.mockReturnValue(mockExec(role));
      mockRoleModel.findByIdAndDelete.mockReturnValue(mockExec(role));
      mockUserService.findIdsByRole.mockResolvedValue([]);

      await service.remove('role-id-1');

      expect(mockCacheService.delByPattern).toHaveBeenCalledWith('cache:rbac:roles:*');
      expect(mockCacheService.del).toHaveBeenCalledWith('rbac:roles:all');
    });

    it('does not touch user documents on delete (S15)', async () => {
      const role = mockRoleDoc({ name: 'moderator', isSystem: false });
      mockRoleModel.findById.mockReturnValue(mockExec(role));
      mockRoleModel.findByIdAndDelete.mockReturnValue(mockExec(role));
      mockUserService.findIdsByRole.mockResolvedValue([]);

      await service.remove('role-id-1');

      expect(mockUserService.invalidateUsersByRole).not.toHaveBeenCalled();
    });

    it('rejects deleting a system role with FORBIDDEN (S4, S9)', async () => {
      mockRoleModel.findById.mockReturnValue(mockExec(mockRoleDoc({ name: 'admin', isSystem: true })));

      await expect(service.remove('role-id-1')).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({
            kind: 'FORBIDDEN',
            code: 'UA-SEC-002',
            statusCode: 403,
          }),
        }),
      );
      expect(mockRoleModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('rejects deleting a role with assigned users with ROLE_IN_USE (S10, S14)', async () => {
      mockRoleModel.findById.mockReturnValue(mockExec(mockRoleDoc({ name: 'moderator', isSystem: false })));
      mockUserService.findIdsByRole.mockResolvedValue(['user-1']);

      await expect(service.remove('role-id-1')).rejects.toEqual(
        expect.objectContaining({
          kind: expect.objectContaining({
            kind: 'ROLE_IN_USE',
            code: 'UA-RBAC-001',
            statusCode: 409,
          }),
        }),
      );
      expect(mockRoleModel.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('throws ENTITY_NOT_FOUND for an unknown role id', async () => {
      mockRoleModel.findById.mockReturnValue(mockExec(null));

      await expect(service.remove('missing')).rejects.toEqual(
        expect.objectContaining({ kind: expect.objectContaining({ kind: 'ENTITY_NOT_FOUND', statusCode: 404 }) }),
      );
      expect(mockRoleModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  describe(`${RoleService.name}.mergeEffectivePermissions`, () => {
    it('should return the role permissions when the user has no explicit grants', () => {
      expect(mergeEffectivePermissions(['user:read', 'user:update'], [])).toEqual([
        'user:read',
        'user:update',
      ]);
    });

    it('should union role and explicit permissions keeping the role first', () => {
      expect(mergeEffectivePermissions(['user:read'], ['audit:read'])).toEqual([
        'user:read',
        'audit:read',
      ]);
    });

    it('should deduplicate permissions present in both sources', () => {
      expect(mergeEffectivePermissions(['user:read', 'user:update'], ['user:read', 'audit:read'])).toEqual([
        'user:read',
        'user:update',
        'audit:read',
      ]);
    });

    it('should pass a wildcard permission through unchanged', () => {
      expect(mergeEffectivePermissions(['*'], [])).toEqual(['*']);
    });

    it('should return an empty array when both sources are empty', () => {
      expect(mergeEffectivePermissions([], [])).toEqual([]);
    });
  });
});
