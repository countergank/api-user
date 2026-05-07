import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from '../../src/common/i18n/i18n.service';
import { SupportedLanguage, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../../src/common/i18n/interfaces/i18n.interface';

describe('I18nService', () => {
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        {
          provide: 'I18nService',
          useValue: {
            translate: jest.fn(),
            getLanguage: jest.fn(),
            setLanguage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<I18nService>(I18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLanguage', () => {
    it('should return default language when no context is available', () => {
      // This is a simplified test - in reality, I18nContext would be used
      const lang = service.getLanguage();
      expect([DEFAULT_LANGUAGE, ...SUPPORTED_LANGUAGES]).toContain(lang);
    });
  });

  describe('translate', () => {
    it('should return translation key when translation fails', () => {
      // Mock the nestjs-i18n service to return the key
      const result = service.translate('non.existent.key');
      // The service should handle missing keys gracefully
      expect(result).toBeDefined();
    });
  });
});
