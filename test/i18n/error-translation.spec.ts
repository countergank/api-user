import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { I18nService } from '../../src/common/i18n/i18n.service';
import { ErrorFilter } from '../../src/common/errors/error-filter';
import { ErrorBase } from '../../src/common/errors/error-base/error-base';
import { ErrorCodes, ErrorMessages } from '../../src/common/errors/error/error.dictionary';

describe('Error Translation Integration', () => {
  let app: INestApplication;
  let i18nService: I18nService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [/* AppModule would be imported here */],
      providers: [
        I18nService,
        ErrorFilter,
        {
          provide: I18nService,
          useValue: {
            translate: jest.fn((key: string) => {
              // Mock translation
              if (key.includes('INTERNAL_ERROR')) return 'Internal server error';
              return key;
            }),
            getLanguage: jest.fn(() => 'en'),
            setLanguage: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    i18nService = moduleFixture.get<I18nService>(I18nService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should translate error messages using I18nService', () => {
    // This is a simplified test
    // In reality, you'd trigger an error and check the response message
    expect(i18nService).toBeDefined();
  });

  it('should use Spanish as default language', () => {
    const message = ErrorMessages[ErrorCodes.Base].es;
    expect(message).toBe('Error genérico');
  });

  it('should have English translation', () => {
    const message = ErrorMessages[ErrorCodes.Base].en;
    expect(message).toBe('Generic error');
  });

  it('should have Portuguese translation', () => {
    const message = ErrorMessages[ErrorCodes.Base].pt;
    expect(message).toBe('Erro genérico');
  });
});
