import { Test, TestingModule } from '@nestjs/testing';
import { PaginatedResponseDTO } from '../../../common/dto/paginated-response.dto';
import { DomainError } from '../../../common/errors/domain.error';
import { ParameterAdminController } from '../parameter-admin.controller';
import { ParameterService } from '../parameter.service';
import { ParameterEntry } from '../parameter.types';

describe(ParameterAdminController.name, () => {
  let controller: ParameterAdminController;

  const mockEntries: ParameterEntry[] = [
    {
      key: 'EMAIL_PROVIDER',
      type: 'string',
      value: 'resend',
      default: 'smtp',
      group: 'email',
      ttl: 300,
      isOverridden: true,
    },
    {
      key: 'MAX_LOGIN_ATTEMPTS',
      type: 'number',
      value: 5,
      default: 5,
      group: 'auth',
      ttl: 300,
      isOverridden: false,
    },
  ];

  const mockService = {
    getAll: jest.fn(),
    getByGroup: jest.fn(),
    findPaginated: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParameterAdminController],
      providers: [{ provide: ParameterService, useValue: mockService }],
    }).compile();

    controller = module.get<ParameterAdminController>(ParameterAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('returns the collection envelope for the requested page', async () => {
      mockService.findPaginated.mockResolvedValue(PaginatedResponseDTO.of(mockEntries, 2, 1, 20));

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result).toBeInstanceOf(PaginatedResponseDTO);
      expect(result.data).toEqual(mockEntries);
      expect(result.total).toBe(2);
      expect(mockService.findPaginated).toHaveBeenCalledWith({ page: 1, limit: 20 });
    });

    it('returns an empty envelope when no parameters exist', async () => {
      mockService.findPaginated.mockResolvedValue(PaginatedResponseDTO.of([], 0, 1, 20));

      const result = await controller.findAll({ page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('findByGroup', () => {
    it('scopes the envelope to the requested group', async () => {
      mockService.findPaginated.mockResolvedValue(PaginatedResponseDTO.of([mockEntries[0]], 1, 1, 20));

      const result = await controller.findByGroup('email', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].key).toBe('EMAIL_PROVIDER');
      expect(mockService.findPaginated).toHaveBeenCalledWith({ group: 'email', page: 1, limit: 20 });
    });

    it('returns an empty envelope for a non-existent group', async () => {
      mockService.findPaginated.mockResolvedValue(PaginatedResponseDTO.of([], 0, 1, 20));

      const result = await controller.findByGroup('nonexistent', { page: 1, limit: 20 });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('should delegate to service and return the updated entry', async () => {
      const updatedEntry: ParameterEntry = {
        ...mockEntries[1],
        value: 10,
      };
      mockService.update.mockResolvedValue(updatedEntry);

      const result = await controller.update('MAX_LOGIN_ATTEMPTS', { value: '10' });

      expect(mockService.update).toHaveBeenCalledWith('MAX_LOGIN_ATTEMPTS', '10');
      expect(result).toEqual(updatedEntry);
    });

    it('should propagate DomainError PARAMETER_NOT_FOUND from service', async () => {
      mockService.update.mockRejectedValue(DomainError.fromKind('PARAMETER_NOT_FOUND'));

      await expect(controller.update('NONEXISTENT', { value: 'test' })).rejects.toBeInstanceOf(DomainError);
      expect(mockService.update).toHaveBeenCalledWith('NONEXISTENT', 'test');
    });

    it('should propagate DomainError PARAMETER_OVERRIDDEN from service', async () => {
      mockService.update.mockRejectedValue(DomainError.fromKind('PARAMETER_OVERRIDDEN'));

      await expect(controller.update('EMAIL_PROVIDER', { value: 'new-value' })).rejects.toBeInstanceOf(DomainError);
    });

    it('should propagate DomainError PARAMETER_VALUE_INVALID from service', async () => {
      mockService.update.mockRejectedValue(DomainError.fromKind('PARAMETER_VALUE_INVALID'));

      await expect(controller.update('MAX_LOGIN_ATTEMPTS', { value: 'invalid' })).rejects.toBeInstanceOf(DomainError);
    });

    it('should rethrow the exact DomainError instance (no try/catch swallowing)', async () => {
      const domainError = DomainError.fromKind('PARAMETER_OVERRIDDEN');
      mockService.update.mockRejectedValue(domainError);

      await expect(controller.update('EMAIL_PROVIDER', { value: 'new-value' })).rejects.toBe(domainError);
    });
  });
});
