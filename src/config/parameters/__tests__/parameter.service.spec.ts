import { Test, TestingModule } from '@nestjs/testing';
import { ParameterService } from '../parameter.service';
import { ParameterStore } from '../parameter.store';
import { ParameterRegistry } from '../parameter-registry';
import { ParameterDefinition, ParameterEntry } from '../parameter.types';

describe(ParameterService.name, () => {
  let service: ParameterService;

  const mockStore = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    getByKeys: jest.fn(),
  };

  const defaultDefs: ParameterDefinition[] = [
    {
      key: 'EMAIL_PROVIDER',
      type: 'string',
      default: 'smtp',
      group: 'email',
      ttl: 300,
    },
    {
      key: 'MAX_LOGIN_ATTEMPTS',
      type: 'number',
      default: 5,
      group: 'auth',
      ttl: 300,
    },
  ];

  const mockRegistry = {
    validate: jest.fn(),
    getAll: jest.fn().mockReturnValue(defaultDefs),
    findByGroup: jest.fn().mockImplementation((group: string) =>
      defaultDefs.filter((d) => d.group === group),
    ),
    findByKey: jest.fn().mockImplementation((key: string) =>
      defaultDefs.find((d) => d.key === key),
    ),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    mockRegistry.getAll.mockReturnValue(defaultDefs);
    mockRegistry.findByGroup.mockImplementation((group: string) =>
      defaultDefs.filter((d) => d.group === group),
    );
    mockRegistry.findByKey.mockImplementation((key: string) =>
      defaultDefs.find((d) => d.key === key),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParameterService,
        { provide: ParameterStore, useValue: mockStore },
        { provide: ParameterRegistry, useValue: mockRegistry },
      ],
    }).compile();

    service = module.get<ParameterService>(ParameterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe(`${ParameterService.name}.get`, () => {
    it('should return value from store', async () => {
      mockStore.get.mockResolvedValue('sendgrid');

      const result = await service.get('EMAIL_PROVIDER');

      expect(result).toBe('sendgrid');
      expect(mockStore.get).toHaveBeenCalledWith('EMAIL_PROVIDER');
    });
  });

  describe(`${ParameterService.name}.set`, () => {
    it('should validate value before setting', async () => {
      mockRegistry.validate.mockImplementation(() => {});
      mockStore.set.mockResolvedValue(undefined);

      await service.set('EMAIL_PROVIDER', 'sendgrid');

      expect(mockRegistry.validate).toHaveBeenCalledWith('EMAIL_PROVIDER', 'sendgrid');
      expect(mockStore.set).toHaveBeenCalledWith('EMAIL_PROVIDER', 'sendgrid');
    });

    it('should throw if validation fails', async () => {
      mockRegistry.validate.mockImplementation(() => {
        throw new Error('validation failed');
      });

      await expect(service.set('MAX_LOGIN_ATTEMPTS', -1)).rejects.toThrow(
        'validation failed',
      );
      expect(mockStore.set).not.toHaveBeenCalled();
    });
  });

  describe(`${ParameterService.name}.getAll`, () => {
    it('should return parameter entries with runtime values', async () => {
      mockStore.getByKeys.mockResolvedValue(
        new Map<string, string | number | boolean>([
          ['EMAIL_PROVIDER', 'resend'],
          ['MAX_LOGIN_ATTEMPTS', 5],
        ]),
      );

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        key: 'EMAIL_PROVIDER',
        value: 'resend',
        default: 'smtp',
        isOverridden: true,
      });
      expect(result[1]).toMatchObject({
        key: 'MAX_LOGIN_ATTEMPTS',
        value: 5,
        default: 5,
        isOverridden: false,
      });
    });

    it('should use default values when runtime values are missing', async () => {
      mockStore.getByKeys.mockResolvedValue(new Map());

      const result = await service.getAll();

      expect(result[0].value).toBe('smtp');
      expect(result[0].isOverridden).toBe(false);
    });

    it('should return empty array when no parameters registered', async () => {
      mockRegistry.getAll.mockReturnValue([]);
      mockStore.getByKeys.mockResolvedValue(new Map());

      const result = await service.getAll();
      expect(result).toEqual([]);
    });
  });

  describe(`${ParameterService.name}.getByGroup`, () => {
    it('should return parameters filtered by group', async () => {
      mockStore.getByKeys.mockResolvedValue(
        new Map<string, string | number | boolean>([
          ['EMAIL_PROVIDER', 'resend'],
          ['MAX_LOGIN_ATTEMPTS', 5],
        ]),
      );

      const result = await service.getByGroup('email');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('EMAIL_PROVIDER');
    });

    it('should return empty array for nonexistent group', async () => {
      mockStore.getByKeys.mockResolvedValue(new Map());

      const result = await service.getByGroup('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe(`${ParameterService.name}.has`, () => {
    it('should delegate to store', () => {
      mockStore.has.mockReturnValue(true);
      expect(service.has('EMAIL_PROVIDER')).toBe(true);
      expect(mockStore.has).toHaveBeenCalledWith('EMAIL_PROVIDER');
    });
  });

  describe(`${ParameterService.name}.delete`, () => {
    it('should delegate to store', async () => {
      mockStore.delete.mockResolvedValue(undefined);
      await service.delete('EMAIL_PROVIDER');
      expect(mockStore.delete).toHaveBeenCalledWith('EMAIL_PROVIDER');
    });
  });
});