import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../app-config.service';

describe(AppConfigService.name, () => {
  let service: AppConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('frontendUrl', () => {
    it('should return FRONTEND_URL from ConfigService', () => {
      mockConfigService.get.mockReturnValue('https://app.example.com');

      expect(service.frontendUrl).toBe('https://app.example.com');
      expect(mockConfigService.get).toHaveBeenCalledWith('FRONTEND_URL');
    });
  });

  describe('emailProvider', () => {
    it('should return EMAIL_PROVIDER from ConfigService when set', () => {
      mockConfigService.get.mockReturnValue('resend');

      expect(service.emailProvider).toBe('resend');
      expect(mockConfigService.get).toHaveBeenCalledWith('EMAIL_PROVIDER');
    });

    it('should return smtp as default when EMAIL_PROVIDER is not set', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(service.emailProvider).toBe('smtp');
    });
  });

  describe('throttle', () => {
    it('should return throttle config with ttl and limit from ConfigService', () => {
      mockConfigService.get
        .mockImplementation((key: string) => {
          if (key === 'THROTTLE_TTL') return '60';
          if (key === 'THROTTLE_LIMIT') return '10';
          return undefined;
        });

      const result = service.throttle;

      expect(result).toEqual({ ttl: '60', limit: '10' });
      expect(mockConfigService.get).toHaveBeenCalledWith('THROTTLE_TTL');
      expect(mockConfigService.get).toHaveBeenCalledWith('THROTTLE_LIMIT');
    });
  });
});
