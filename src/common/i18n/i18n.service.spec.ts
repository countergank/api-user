import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';
import { I18nModule } from './i18n.module';
import { I18nService as NestI18nService } from 'nestjs-i18n';
import { SupportedLanguage, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './interfaces/i18n.interface';

describe('I18nService (unit)', () => {
  let service: I18nService;
  let nestI18nService: NestI18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [I18nModule],
    }).compile();

    service = module.get<I18nService>(I18nService);
    nestI18nService = module.get<NestI18nService>(NestI18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLanguage', () => {
    it('should return a supported language', () => {
      const lang = service.getLanguage();
      expect(SUPPORTED_LANGUAGES).toContain(lang);
    });
  });

  describe('translate', () => {
    it('should return translation for existing key', () => {
      jest.spyOn(nestI18nService, 'translate').mockReturnValue('translated text');
      
      const result = service.translate('errors.INTERNAL_ERROR');
      expect(result).toBe('translated text');
    });

    it('should return key when translation fails (catch block)', () => {
      jest.spyOn(nestI18nService, 'translate').mockImplementation(() => {
        throw new Error('Translation error');
      });
      
      const result = service.translate('non.existent.key');
      expect(result).toBe('non.existent.key');
    });

    it('should handle Promise return (line 27)', () => {
      jest.spyOn(nestI18nService, 'translate').mockReturnValue(
        Promise.resolve('translated') as any
      );
      
      const result = service.translate('errors.INTERNAL_ERROR');
      // When it returns Promise, the service returns the key as fallback
      expect(result).toBe('errors.INTERNAL_ERROR');
    });

    it('should handle non-string return (line 34)', () => {
      jest.spyOn(nestI18nService, 'translate').mockReturnValue({} as any);
      
      const result = service.translate('errors.INTERNAL_ERROR');
      // When not a string, returns the key
      expect(result).toBe('errors.INTERNAL_ERROR');
    });
  });
});
