import { Test, TestingModule } from '@nestjs/testing';
import { I18nMiddleware } from './i18n.middleware';
import { I18nService } from './i18n.service';
import { NextFunction, Response } from 'express';

describe('I18nMiddleware (unit)', () => {
  let middleware: I18nMiddleware;
  let i18nService: I18nService;
  let mockNext: NextFunction;
  let mockResponse: Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nMiddleware,
        {
          provide: I18nService,
          useValue: {
            getLanguage: jest.fn(),
            translate: jest.fn(),
            setLanguage: jest.fn(),
          },
        },
      ],
    }).compile();

    middleware = module.get<I18nMiddleware>(I18nMiddleware);
    i18nService = module.get<I18nService>(I18nService);
    mockNext = jest.fn();
    mockResponse = {} as Response;
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should set Spanish as default when no Accept-Language header', () => {
    const req: any = {
      headers: {},
    };

    middleware.use(req, mockResponse, mockNext);

    expect(req.i18nLang).toBe('es');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should detect English from Accept-Language header', () => {
    const req: any = {
      headers: {
        'accept-language': 'en,es;q=0.9',
      },
    };

    middleware.use(req, mockResponse, mockNext);

    expect(req.i18nLang).toBe('en');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should detect Portuguese from Accept-Language header', () => {
    const req: any = {
      headers: {
        'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    };

    middleware.use(req, mockResponse, mockNext);

    expect(req.i18nLang).toBe('pt');
    expect(mockNext).toHaveBeenCalled();
  });

  it('should fall back to Spanish for unsupported language', () => {
    const req: any = {
      headers: {
        'accept-language': 'fr,de;q=0.9', // French & German not supported
      },
    };

    middleware.use(req, mockResponse, mockNext);

    expect(req.i18nLang).toBe('es'); // Falls back to default
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle empty Accept-Language header', () => {
    const req: any = {
      headers: {
        'accept-language': '',
      },
    };

    middleware.use(req, mockResponse, mockNext);

    expect(req.i18nLang).toBe('es'); // Falls back to default
    expect(mockNext).toHaveBeenCalled();
  });
});
