import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ParameterAdminController } from '../parameter-admin.controller';
import { ParameterService } from '../parameter.service';
import { ParameterRegistry } from '../parameter-registry';
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
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
  };

  const mockRegistry = {
    findByKey: jest.fn(),
    getAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParameterAdminController],
      providers: [
        { provide: ParameterService, useValue: mockService },
        { provide: ParameterRegistry, useValue: mockRegistry },
      ],
    }).compile();

    controller = module.get<ParameterAdminController>(ParameterAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all parameter entries', async () => {
      mockService.getAll.mockResolvedValue(mockEntries);

      const result = await controller.findAll();

      expect(result).toEqual(mockEntries);
      expect(mockService.getAll).toHaveBeenCalled();
    });

    it('should return empty array when no parameters exist', async () => {
      mockService.getAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByGroup', () => {
    it('should return parameters for the given group', async () => {
      mockService.getByGroup.mockResolvedValue([mockEntries[0]]);

      const result = await controller.findByGroup('email');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('EMAIL_PROVIDER');
      expect(mockService.getByGroup).toHaveBeenCalledWith('email');
    });

    it('should return empty array for non-existent group', async () => {
      mockService.getByGroup.mockResolvedValue([]);

      const result = await controller.findByGroup('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      mockRegistry.findByKey.mockImplementation((key: string) => {
        const entry = mockEntries.find((e) => e.key === key);
        if (!entry) return undefined;
        return { key: entry.key, type: entry.type, default: entry.default, group: entry.group, ttl: entry.ttl };
      });
    });

    it('should update parameter value and return updated entry', async () => {
      const nonOverriddenEntry: ParameterEntry = { ...mockEntries[1] };
      const updatedEntry: ParameterEntry = {
        ...nonOverriddenEntry,
        value: 10,
      };

      mockService.has.mockReturnValue(true);
      mockService.getAll.mockResolvedValue([nonOverriddenEntry]);
      mockService.set.mockResolvedValue(undefined);
      mockRegistry.findByKey.mockReturnValue({
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
      });
      // After update, return the modified entry
      mockService.getAll.mockResolvedValueOnce([nonOverriddenEntry]);
      mockService.getAll.mockResolvedValueOnce([updatedEntry]);

      const result = await controller.update('MAX_LOGIN_ATTEMPTS', { value: '10' });

      expect(result).toBeDefined();
      expect(mockService.has).toHaveBeenCalledWith('MAX_LOGIN_ATTEMPTS');
      expect(mockService.set).toHaveBeenCalledWith('MAX_LOGIN_ATTEMPTS', 10);
    });

    it('should throw NotFoundException for non-existent key', async () => {
      mockService.has.mockReturnValue(false);

      await expect(
        controller.update('NONEXISTENT', { value: 'test' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockService.set).not.toHaveBeenCalled();
    });

    it('should throw ConflictException for env-overridden parameter', async () => {
      mockService.has.mockReturnValue(true);
      mockService.getAll.mockResolvedValue(mockEntries);

      await expect(
        controller.update('EMAIL_PROVIDER', { value: 'new-value' }),
      ).rejects.toThrow(ConflictException);

      expect(mockService.set).not.toHaveBeenCalled();
    });

    it('should throw UnprocessableEntityException for invalid number value', async () => {
      const numberEntry: ParameterEntry = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        value: 5,
        default: 5,
        group: 'auth',
        ttl: 300,
        isOverridden: false,
      };

      mockService.has.mockReturnValue(true);
      mockService.getAll.mockResolvedValue([numberEntry]);
      mockRegistry.findByKey.mockReturnValue({
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
      });

      await expect(
        controller.update('MAX_LOGIN_ATTEMPTS', { value: 'invalid' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });
});
