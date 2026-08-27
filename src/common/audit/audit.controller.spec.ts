import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { I18nService } from '../../common/i18n/i18n.service';
import { AuditLogFilterDTO } from './dto/audit-log-filter.dto';
import { PaginatedAuditLogResponseDTO } from './dto/paginated-audit-log-response.dto';
import { Mock } from '../../test-utils';

describe(AuditController.name, () => {
  let controller: AuditController;
  let auditService: AuditService;

  const mockAuditService = {
    findPaginated: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn().mockResolvedValue('translated'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        { provide: AuditService, useValue: mockAuditService },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    auditService = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockResult = {
        data: [
          {
            _id: 'log-id-1',
            correlationId: 'corr-1',
            userId: 'user-1',
            action: 'user.create',
            resource: 'user',
            resourceId: 'resource-1',
            ipAddress: '192.168.1.1',
            createdAt: new Date(),
          },
        ],
        total: 1,
      };
      mockAuditService.findPaginated.mockResolvedValue(mockResult);

      const filters: AuditLogFilterDTO = { page: 1, limit: 20 };

      const result = await controller.findAuditLogs(filters);

      expect(auditService.findPaginated).toHaveBeenCalledWith({
        userId: undefined,
        action: undefined,
        resource: undefined,
        from: undefined,
        to: undefined,
        ipAddress: undefined,
        page: 1,
        limit: 20,
      });

      expect(result).toBeInstanceOf(PaginatedAuditLogResponseDTO);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should pass filter parameters to service', async () => {
      mockAuditService.findPaginated.mockResolvedValue({ data: [], total: 0 });

      const filters: AuditLogFilterDTO = {
        userId: 'user-123',
        action: 'user.create',
        resource: 'user',
        ipAddress: '10.0.0.1',
        page: 2,
        limit: 10,
      };

      await controller.findAuditLogs(filters);

      expect(auditService.findPaginated).toHaveBeenCalledWith({
        userId: 'user-123',
        action: 'user.create',
        resource: 'user',
        from: undefined,
        to: undefined,
        ipAddress: '10.0.0.1',
        page: 2,
        limit: 10,
      });
    });

    it('should handle empty results', async () => {
      mockAuditService.findPaginated.mockResolvedValue({ data: [], total: 0 });

      const filters: AuditLogFilterDTO = { page: 1, limit: 20 };

      const result = await controller.findAuditLogs(filters);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });
});
