import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';
import { SUPPORTED_LANGUAGES } from './interfaces/i18n.interface';

// Mock fs and nestjs-i18n
jest.mock('node:fs');
jest.mock('nestjs-i18n', () => ({
  I18nService: class {},
  I18nContext: { current: jest.fn() },
  QueryResolver: class {},
  HeaderResolver: class {},
  I18nModule: class {},
}));

describe('I18nService (unit)', () => {
  let service: I18nService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        {
          provide: 'I18nService_nest',
          useValue: { translate: jest.fn().mockResolvedValue('fallback') },
        },
      ],
    })
      .overrideProvider(I18nService)
      .useFactory({
        factory: () => {
          const svc = Object.create(I18nService.prototype);
          // Inject mock translations
          (svc as any).translations = new Map([
            ['en', { password: { PASSWORD_TOO_SHORT: 'Password too short' } }],
            ['es', { password: { PASSWORD_TOO_SHORT: 'Contraseña corta' } }],
            ['pt', { password: { PASSWORD_TOO_SHORT: 'Senha curta' } }],
          ]);
          (svc as any).nestI18nService = { translate: jest.fn().mockResolvedValue('fallback') };
          return svc;
        },
      })
      .compile();

    service = module.get<I18nService>(I18nService);
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

  describe('translate (direct)', () => {
    it('should translate to English', async () => {
      const result = await service.translate('password.PASSWORD_TOO_SHORT', 'en');
      expect(result).toBe('Password too short');
    });

    it('should translate to Spanish', async () => {
      const result = await service.translate('password.PASSWORD_TOO_SHORT', 'es');
      expect(result).toBe('Contraseña corta');
    });

    it('should translate to Portuguese', async () => {
      const result = await service.translate('password.PASSWORD_TOO_SHORT', 'pt');
      expect(result).toBe('Senha curta');
    });

    it('should fallback to nestjs-i18n for unknown keys', async () => {
      const result = await service.translate('missing.key', 'en');
      // Falls back to nestjs-i18n mock which returns 'fallback'
      expect(result).toBe('fallback');
    });
  });
});
