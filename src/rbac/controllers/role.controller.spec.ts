import { Test, TestingModule } from '@nestjs/testing';
import { AUDIT_ACTION_KEY } from '../../common/audit/audit.decorator';
import { PERMISSIONS_KEY } from '../../auth/decorators/permissions.decorator';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { DomainError } from '../../common/errors/domain.error';
import { I18nService } from '../../common/i18n/i18n.service';
import { UserRole } from '../../user/entities/user.entity';
import { Role } from '../entities/role.entity';
import { RoleService } from '../services/role.service';
import { RoleController } from './role.controller';

describe(RoleController.name, () => {
  let controller: RoleController;

  const mockRole = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      _id: 'role-id-1',
      name: 'moderator',
      description: 'Moderates content',
      permissionIds: ['user:read'],
      isSystem: false,
      isDefault: false,
      ...overrides,
    }) as unknown as Role;

  const mockRoleService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updatePermissions: jest.fn(),
  };

  // Echoes the key so a missing translation keeps the stored description.
  const mockI18n = {
    translate: jest.fn().mockImplementation((key: string) => Promise.resolve(key)),
    getLanguage: jest.fn().mockReturnValue('en'),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockI18n.translate.mockImplementation((key: string) => Promise.resolve(key));
    mockI18n.getLanguage.mockReturnValue('en');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [
        { provide: RoleService, useValue: mockRoleService },
        { provide: I18nService, useValue: mockI18n },
      ],
    }).compile();

    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('route metadata', () => {
    it.each([
      ['findAll', 'role:read', null],
      ['create', 'role:create', 'role.create'],
      ['update', 'role:update', 'role.update'],
      ['remove', 'role:delete', 'role.delete'],
      ['updatePermissions', 'role:update', null],
    ])('declares the permission and audit metadata of %s', (handler, permission, auditAction) => {
      const target = controller[handler as keyof RoleController] as unknown as object;

      expect(Reflect.getMetadata(PERMISSIONS_KEY, target)).toEqual([permission]);

      if (auditAction) {
        expect(Reflect.getMetadata(AUDIT_ACTION_KEY, target)).toMatchObject({
          action: auditAction,
          resource: 'role',
        });
      }
    });

    it.each(['create', 'update', 'remove', 'updatePermissions'])(
      'restricts %s to the admin role (S12)',
      (handler) => {
        const target = controller[handler as keyof RoleController] as unknown as object;

        expect(Reflect.getMetadata(ROLES_KEY, target)).toEqual([UserRole.ADMIN]);
      },
    );
  });

  describe(`${RoleController.name}.findAll`, () => {
    it('keeps returning the role list', async () => {
      mockRoleService.findAll.mockResolvedValue([mockRole()]);

      await expect(controller.findAll('en')).resolves.toEqual({
        roles: [expect.objectContaining({ name: 'moderator' })],
      });
    });
  });

  describe(`${RoleController.name}.create`, () => {
    it('creates the role with only the fields of the HTTP contract (S1)', async () => {
      mockRoleService.create.mockResolvedValue(mockRole());

      const result = await controller.create(
        { name: 'moderator', description: 'Moderates content', permissionIds: ['user:read'] },
        'en',
      );

      expect(mockRoleService.create).toHaveBeenCalledWith({
        name: 'moderator',
        description: 'Moderates content',
        permissionIds: ['user:read'],
      });
      expect(result.role).toMatchObject({ name: 'moderator', description: 'Moderates content' });
    });

    it('never forwards an `isSystem` sent by the client (S4)', async () => {
      mockRoleService.create.mockResolvedValue(mockRole());

      await controller.create({ name: 'moderator', isSystem: true } as never, 'en');

      expect(mockRoleService.create).toHaveBeenCalledWith({
        name: 'moderator',
        description: undefined,
        permissionIds: undefined,
      });
      expect(mockRoleService.create).not.toHaveBeenCalledWith(expect.objectContaining({ isSystem: true }));
    });

    it('propagates the duplicate-name conflict raised by the service (S6)', async () => {
      const conflict = DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
      mockRoleService.create.mockRejectedValue(conflict);

      await expect(controller.create({ name: 'moderator' }, 'en')).rejects.toBe(conflict);
    });
  });

  describe(`${RoleController.name}.update`, () => {
    it('forwards the id and the patch body and returns the role (S2, S7)', async () => {
      mockRoleService.update.mockResolvedValue(mockRole({ name: 'moderator-v2' }));

      const result = await controller.update('role-id-1', { name: 'moderator-v2' }, 'en');

      expect(mockRoleService.update).toHaveBeenCalledWith('role-id-1', { name: 'moderator-v2' });
      expect(result.role).toMatchObject({ name: 'moderator-v2' });
    });
  });

  describe(`${RoleController.name}.remove`, () => {
    it('deletes the role and answers with the localized message (S3, S8)', async () => {
      mockRoleService.remove.mockResolvedValue(mockRole());

      await expect(controller.remove('role-id-1', 'en')).resolves.toEqual({
        message: 'messages.role_deleted',
        roleId: 'role-id-1',
      });
      expect(mockRoleService.remove).toHaveBeenCalledWith('role-id-1');
    });

    it('propagates a blocked deletion instead of reporting success (S9, S10)', async () => {
      const blocked = DomainError.fromKind('ROLE_IN_USE');
      mockRoleService.remove.mockRejectedValue(blocked);

      await expect(controller.remove('role-id-1', 'en')).rejects.toBe(blocked);
    });
  });

  describe(`${RoleController.name}.updatePermissions`, () => {
    it('returns the updated role with the validated permissions (S13)', async () => {
      mockRoleService.updatePermissions.mockResolvedValue(mockRole({ permissionIds: ['*'] }));

      const result = await controller.updatePermissions('role-id-1', { permissionIds: ['*'] }, 'en');

      expect(mockRoleService.updatePermissions).toHaveBeenCalledWith('role-id-1', ['*']);
      expect(result.role).toMatchObject({ permissionIds: ['*'] });
    });

    it('answers 404 when the role does not exist', async () => {
      mockRoleService.updatePermissions.mockResolvedValue(null);

      await expect(
        controller.updatePermissions('missing', { permissionIds: ['user:read'] }, 'en'),
      ).rejects.toEqual(
        expect.objectContaining({ kind: expect.objectContaining({ kind: 'ENTITY_NOT_FOUND', statusCode: 404 }) }),
      );
    });
  });
});
