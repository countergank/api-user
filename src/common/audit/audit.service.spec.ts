import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLog } from './entities/audit-log.entity';

describe(AuditService.name, () => {
  let service: AuditService;
  let repository: jest.Mocked<AuditLogRepository>;

  beforeEach(async () => {
    const mockRepository = {
      findPaginated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditLogRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    repository = module.get(AuditLogRepository) as jest.Mocked<AuditLogRepository>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPaginated', () => {
    it('should delegate to repository with default params', async () => {
      const expectedResult = { data: [], total: 0 };
      repository.findPaginated.mockResolvedValue(expectedResult);

      const result = await service.findPaginated({});

      expect(repository.findPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
      expect(result).toEqual(expectedResult);
    });

    it('should pass filters to repository', async () => {
      const expectedResult = { data: [], total: 0 };
      repository.findPaginated.mockResolvedValue(expectedResult);

      await service.findPaginated({
        userId: 'user-1',
        action: 'user.create',
        page: 2,
        limit: 50,
      });

      expect(repository.findPaginated).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        userId: 'user-1',
        action: 'user.create',
      });
    });

    it('should validate page is at least 1', async () => {
      const expectedResult = { data: [], total: 0 };
      repository.findPaginated.mockResolvedValue(expectedResult);

      await service.findPaginated({ page: 0 });

      expect(repository.findPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
      });
    });

    it('should validate limit is between 1 and 100', async () => {
      const expectedResult = { data: [], total: 0 };
      repository.findPaginated.mockResolvedValue(expectedResult);

      await service.findPaginated({ limit: 200 });

      expect(repository.findPaginated).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
      });
    });
  });
});
