import { ExecutionContext } from '@nestjs/common';
import { extractParameter } from '../decorators/extract-parameter.helper';
import { ParameterService } from '../parameter.service';

describe('extractParameter', () => {
  const mockService = {
    has: jest.fn(),
    get: jest.fn(),
  };

  const mockCtx = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({}),
    }),
  } as unknown as ExecutionContext;

  beforeAll(() => {
    (ParameterService as any).instance = mockService;
  });

  afterAll(() => {
    (ParameterService as any).instance = null;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return value for known key', async () => {
    mockService.has.mockReturnValue(true);
    mockService.get.mockResolvedValue(10);

    const factory = extractParameter('THROTTLE_LIMIT');
    const result = await factory(undefined, mockCtx);

    expect(result).toBe(10);
    expect(mockService.has).toHaveBeenCalledWith('THROTTLE_LIMIT');
    expect(mockService.get).toHaveBeenCalledWith('THROTTLE_LIMIT');
  });

  it('should return undefined for unknown key (default)', async () => {
    mockService.has.mockReturnValue(false);

    const factory = extractParameter('UNKNOWN_KEY');
    const result = await factory(undefined, mockCtx);

    expect(result).toBeUndefined();
    expect(mockService.has).toHaveBeenCalledWith('UNKNOWN_KEY');
    expect(mockService.get).not.toHaveBeenCalled();
  });

  it('should throw for unknown key in strict mode', async () => {
    mockService.has.mockReturnValue(false);

    const factory = extractParameter('UNKNOWN_KEY', { strict: true });

    await expect(factory(undefined, mockCtx)).rejects.toThrow(
      'Parameter "UNKNOWN_KEY" is unknown',
    );
    expect(mockService.has).toHaveBeenCalledWith('UNKNOWN_KEY');
    expect(mockService.get).not.toHaveBeenCalled();
  });

  it('should return value for known key in strict mode', async () => {
    mockService.has.mockReturnValue(true);
    mockService.get.mockResolvedValue('smtp');

    const factory = extractParameter('EMAIL_PROVIDER', { strict: true });
    const result = await factory(undefined, mockCtx);

    expect(result).toBe('smtp');
    expect(mockService.has).toHaveBeenCalledWith('EMAIL_PROVIDER');
    expect(mockService.get).toHaveBeenCalledWith('EMAIL_PROVIDER');
  });

  it('should throw if service is not initialized', async () => {
    (ParameterService as any).instance = null;

    const factory = extractParameter('THROTTLE_LIMIT');

    await expect(factory(undefined, mockCtx)).rejects.toThrow(
      'ParameterService has not been initialized',
    );

    (ParameterService as any).instance = mockService;
  });
});
