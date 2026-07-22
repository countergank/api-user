import { Test, TestingModule } from '@nestjs/testing';
import { ParameterService } from '../parameter.service';
import { ParameterStore } from '../parameter.store';
import { ParameterRegistry } from '../parameter-registry';

describe(ParameterService.name, () => {
  let service: ParameterService;

  const mockStore = {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
  };

  const mockRegistry = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

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