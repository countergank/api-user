import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS_KEY } from '../../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { AUDIT_ACTION_KEY } from '../../common/audit/audit.decorator';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { UserRole } from '../../user/entities/user.entity';
import { Permission, PermissionCategory } from '../entities/permission.entity';
import { PermissionService } from '../services/permission.service';
import { AdminPermissionController } from './admin-permission.controller';

describe(AdminPermissionController.name, () => {
  let controller: AdminPermissionController;

  const mockPermission = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      _id: { toString: () => 'perm-id-1' },
      name: 'banner:manage',
      description: 'Manage banners',
      category: PermissionCategory.USER,
      isSystem: false,
      isActive: true,
      ...overrides,
    }) as unknown as Permission;

  const mockPermissionService = {
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockI18n = {
    translate: jest.fn().mockImplementation((key: string) => Promise.resolve(key)),
    getLanguage: jest.fn().mockReturnValue('en'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockI18n.translate.mockImplementation((key: string) => Promise.resolve(key));
    mockI18n.getLanguage.mockReturnValue('en');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPermissionController],
      providers: [
        { provide: PermissionService, useValue: mockPermissionService },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    controller = module.get<AdminPermissionController>(AdminPermissionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('route metadata', () => {
    it.each([
      ['create', 'permission:create', 'permission.create'],
      ['update', 'permission:update', 'permission.update'],
    ])('declares the permission and audit metadata of %s', (handler, permission, auditAction) => {
      const target = controller[handler as keyof AdminPermissionController] as unknown as object;

      expect(Reflect.getMetadata(PERMISSIONS_KEY, target)).toEqual([permission]);
      expect(Reflect.getMetadata(AUDIT_ACTION_KEY, target)).toMatchObject({
        action: auditAction,
        resource: 'permission',
      });
    });

    it.each(['create', 'update'])('restricts %s to the admin role', (handler) => {
      const target = controller[handler as keyof AdminPermissionController] as unknown as object;

      expect(Reflect.getMetadata(ROLES_KEY, target)).toEqual([UserRole.ADMIN]);
    });
  });

  describe(`${AdminPermissionController.name}.create`, () => {
    it('creates the permission with only the fields of the HTTP contract (S1)', async () => {
      mockPermissionService.create.mockResolvedValue(mockPermission());

      const result = await controller.create(
        { name: 'banner:manage', description: 'Manage banners', category: PermissionCategory.USER },
        'en',
      );

      expect(mockPermissionService.create).toHaveBeenCalledWith({
        name: 'banner:manage',
        description: 'Manage banners',
        category: PermissionCategory.USER,
      });
      expect(result.permission).toMatchObject({ name: 'banner:manage' });
    });

    it('propagates the duplicate-name conflict raised by the service (S2)', async () => {
      const conflict = DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
      mockPermissionService.create.mockRejectedValue(conflict);

      await expect(
        controller.create({ name: 'banner:manage', category: PermissionCategory.USER }, 'en'),
      ).rejects.toBe(conflict);
    });
  });

  describe(`${AdminPermissionController.name}.update`, () => {
    it('forwards the id and the patch body and returns the permission (S4)', async () => {
      mockPermissionService.update.mockResolvedValue(
        mockPermission({ description: 'Rotated', isActive: false }),
      );

      const result = await controller.update('perm-id-1', { description: 'Rotated', isActive: false }, 'en');

      expect(mockPermissionService.update).toHaveBeenCalledWith('perm-id-1', {
        description: 'Rotated',
        isActive: false,
      });
      expect(result.permission).toMatchObject({ description: 'Rotated', isActive: false });
    });

    it('propagates the not-found error raised by the service (S4)', async () => {
      const missing = DomainError.fromKind('ENTITY_NOT_FOUND');
      mockPermissionService.update.mockRejectedValue(missing);

      await expect(controller.update('missing', { isActive: false }, 'en')).rejects.toBe(missing);
    });
  });
});
