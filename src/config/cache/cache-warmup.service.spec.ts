import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../../rbac/services/permission.service';
import { RoleService } from '../../rbac/services/role.service';
import { EmailTemplateService } from '../../email/service/email-template.service';
import { CacheWarmupService } from './cache-warmup.service';

describe(CacheWarmupService.name, () => {
  let service: CacheWarmupService;

  const mockConfig = { get: jest.fn() };
  const mockPermissions = { findAll: jest.fn() };
  const mockRoles = { findAll: jest.fn() };
  const mockTemplates = { warmCache: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.get.mockImplementation((_key: string, defaultValue?: string) => defaultValue);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheWarmupService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: PermissionService, useValue: mockPermissions },
        { provide: RoleService, useValue: mockRoles },
        { provide: EmailTemplateService, useValue: mockTemplates },
      ],
    }).compile();

    service = module.get<CacheWarmupService>(CacheWarmupService);
  });

  it('warms permissions, roles and email templates at bootstrap', async () => {
    mockPermissions.findAll.mockResolvedValue([{ name: 'user:read' }]);
    mockRoles.findAll.mockResolvedValue([{ name: 'ADMIN' }, { name: 'USER' }]);
    mockTemplates.warmCache.mockResolvedValue(10);

    await service.onApplicationBootstrap();

    expect(mockPermissions.findAll).toHaveBeenCalledTimes(1);
    expect(mockRoles.findAll).toHaveBeenCalledTimes(1);
    expect(mockTemplates.warmCache).toHaveBeenCalledTimes(1);
  });

  it('keeps bootstrapping when a warm-up step fails', async () => {
    mockPermissions.findAll.mockRejectedValue(new Error('db down'));
    mockRoles.findAll.mockResolvedValue([]);
    mockTemplates.warmCache.mockResolvedValue(3);

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();

    expect(mockRoles.findAll).toHaveBeenCalledTimes(1);
    expect(mockTemplates.warmCache).toHaveBeenCalledTimes(1);
  });

  it('skips every warm-up step when CACHE_WARMUP_ENABLED=false', async () => {
    mockConfig.get.mockReturnValue('false');

    await service.onApplicationBootstrap();

    expect(mockPermissions.findAll).not.toHaveBeenCalled();
    expect(mockRoles.findAll).not.toHaveBeenCalled();
    expect(mockTemplates.warmCache).not.toHaveBeenCalled();
  });

  it('runs by default when CACHE_WARMUP_ENABLED is not set', async () => {
    mockPermissions.findAll.mockResolvedValue([]);
    mockRoles.findAll.mockResolvedValue([]);
    mockTemplates.warmCache.mockResolvedValue(0);

    await service.onApplicationBootstrap();

    expect(mockPermissions.findAll).toHaveBeenCalledTimes(1);
  });
});
