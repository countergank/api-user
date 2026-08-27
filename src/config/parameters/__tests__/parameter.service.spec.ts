import { Test, TestingModule } from '@nestjs/testing';
import { DomainError } from '../../../common/errors/domain.error';
import { ParameterService } from '../parameter.service';
import { ParameterStore } from '../parameter.store';
import { ParameterRegistry } from '../parameter-registry';
import { ParameterDefinition, ParameterEntry } from '../parameter.types';

/**
 * Assert that a promise rejects with a DomainError carrying the expected
 * ErrorKind. Fails when the promise resolves or when the rejected value is
 * not a DomainError with the exact kind.
 */
async function expectDomainError(promise: Promise<unknown>, kind: string): Promise<void> {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(DomainError);
  expect((thrown as DomainError).kind.kind).toBe(kind);
}

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
    findByGroup: jest.fn().mockImplementation((group: string) => defaultDefs.filter((d) => d.group === group)),
    findByKey: jest.fn().mockImplementation((key: string) => defaultDefs.find((d) => d.key === key)),
  };

  beforeEach(async () => {
    // Reset static instance before each test
    ParameterService.instance = null;

    jest.resetAllMocks();
    mockRegistry.getAll.mockReturnValue(defaultDefs);
    mockRegistry.findByGroup.mockImplementation((group: string) => defaultDefs.filter((d) => d.group === group));
    mockRegistry.findByKey.mockImplementation((key: string) => defaultDefs.find((d) => d.key === key));

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

      await expect(service.set('MAX_LOGIN_ATTEMPTS', -1)).rejects.toThrow('validation failed');
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

  describe(`${ParameterService.name}.update`, () => {
    it('should throw PARAMETER_NOT_FOUND when the key does not exist', async () => {
      mockStore.has.mockReturnValue(false);

      await expectDomainError(service.update('NONEXISTENT', 'some-value'), 'PARAMETER_NOT_FOUND');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('should throw PARAMETER_OVERRIDDEN when the parameter is env-overridden', async () => {
      mockStore.has.mockReturnValue(true);
      mockStore.getByKeys.mockResolvedValue(new Map<string, string | number | boolean>([['EMAIL_PROVIDER', 'resend']]));

      await expectDomainError(service.update('EMAIL_PROVIDER', 'smtp'), 'PARAMETER_OVERRIDDEN');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('should throw PARAMETER_VALUE_INVALID for a non-numeric value on a number parameter', async () => {
      mockStore.has.mockReturnValue(true);
      mockStore.getByKeys.mockResolvedValue(new Map<string, string | number | boolean>([['MAX_LOGIN_ATTEMPTS', 5]]));

      await expectDomainError(service.update('MAX_LOGIN_ATTEMPTS', 'not-a-number'), 'PARAMETER_VALUE_INVALID');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('should throw PARAMETER_VALUE_INVALID when THROTTLE_LIMIT is not positive', async () => {
      const throttleDef: ParameterDefinition = {
        key: 'THROTTLE_LIMIT',
        type: 'number',
        default: 100,
        group: 'throttle',
        ttl: 300,
      };
      mockRegistry.getAll.mockReturnValue([...defaultDefs, throttleDef]);
      mockRegistry.findByKey.mockImplementation((key: string) =>
        [...defaultDefs, throttleDef].find((d) => d.key === key),
      );
      mockStore.has.mockReturnValue(true);
      mockStore.getByKeys.mockResolvedValue(new Map<string, string | number | boolean>([['THROTTLE_LIMIT', 100]]));

      await expectDomainError(service.update('THROTTLE_LIMIT', '0'), 'PARAMETER_VALUE_INVALID');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('should throw PARAMETER_VALUE_INVALID for an invalid boolean value', async () => {
      const flagDef: ParameterDefinition = {
        key: 'FEATURE_FLAG',
        type: 'boolean',
        default: false,
        group: 'feature',
        ttl: 300,
      };
      mockRegistry.getAll.mockReturnValue([...defaultDefs, flagDef]);
      mockRegistry.findByKey.mockImplementation((key: string) => [...defaultDefs, flagDef].find((d) => d.key === key));
      mockStore.has.mockReturnValue(true);
      mockStore.getByKeys.mockResolvedValue(new Map<string, string | number | boolean>([['FEATURE_FLAG', false]]));

      await expectDomainError(service.update('FEATURE_FLAG', 'maybe'), 'PARAMETER_VALUE_INVALID');
      expect(mockStore.set).not.toHaveBeenCalled();
    });

    it('should coerce, set, and return the updated entry on success', async () => {
      mockStore.has.mockReturnValue(true);
      mockStore.getByKeys
        .mockResolvedValueOnce(new Map<string, string | number | boolean>([['MAX_LOGIN_ATTEMPTS', 5]]))
        .mockResolvedValue(new Map<string, string | number | boolean>([['MAX_LOGIN_ATTEMPTS', 10]]));
      mockStore.set.mockResolvedValue(undefined);

      const result = await service.update('MAX_LOGIN_ATTEMPTS', '10');

      expect(mockStore.set).toHaveBeenCalledWith('MAX_LOGIN_ATTEMPTS', 10);
      expect(result).toMatchObject({ key: 'MAX_LOGIN_ATTEMPTS', value: 10 });
    });

    it('should throw PARAMETER_NOT_FOUND defensively when entry disappears after set', async () => {
      mockStore.has.mockReturnValue(true);
      mockStore.getByKeys.mockResolvedValue(new Map<string, string | number | boolean>([['MAX_LOGIN_ATTEMPTS', 5]]));
      // Second getAll (post-set re-read) returns no defs → entry vanishes
      mockRegistry.getAll.mockReturnValueOnce([...defaultDefs]).mockReturnValueOnce([]);
      mockStore.set.mockResolvedValue(undefined);

      await expectDomainError(service.update('MAX_LOGIN_ATTEMPTS', '10'), 'PARAMETER_NOT_FOUND');
      expect(mockStore.set).toHaveBeenCalledWith('MAX_LOGIN_ATTEMPTS', 10);
    });
  });

  describe(`${ParameterService.name} static holder`, () => {
    it('should have instance as null before bootstrap', () => {
      expect(ParameterService.instance).toBeNull();
    });

    it('should set instance during onApplicationBootstrap', () => {
      service.onApplicationBootstrap();
      expect(ParameterService.instance).toBe(service);
    });

    it('should return instance from ensureInitialized after bootstrap', () => {
      service.onApplicationBootstrap();
      const result = ParameterService.ensureInitialized();
      expect(result).toBe(service);
    });

    it('should throw from ensureInitialized before bootstrap', () => {
      expect(() => ParameterService.ensureInitialized()).toThrow('ParameterService has not been initialized');
    });
  });
});
