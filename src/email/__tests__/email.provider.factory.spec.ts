import { Test, TestingModule } from '@nestjs/testing';
import { EmailProviderFactory } from '../email.provider.factory';
import { ParameterService } from '../../config/parameters/parameter.service';
import { SmtpProvider } from '../providers/smtp.provider';
import { ResendProvider } from '../providers/resend.provider';

describe('EmailProviderFactory', () => {
  let factory: EmailProviderFactory;

  const mockParameterService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test_key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProviderFactory,
        { provide: ParameterService, useValue: mockParameterService },
      ],
    }).compile();

    factory = module.get<EmailProviderFactory>(EmailProviderFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should create SmtpProvider when EMAIL_PROVIDER is smtp', async () => {
    mockParameterService.get.mockImplementation(async (key: string) => {
      const values: Record<string, string | number | boolean> = {
        EMAIL_PROVIDER: 'smtp',
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_SECURE: false,
        EMAIL_FROM: 'noreply@countergank.com',
        RESEND_FROM_EMAIL: 'noreply@countergank.com',
      };
      return values[key];
    });

    const provider = await factory.createProvider();
    expect(provider).toBeInstanceOf(SmtpProvider);
  });

  it('should create ResendProvider when EMAIL_PROVIDER is resend', async () => {
    mockParameterService.get.mockImplementation(async (key: string) => {
      const values: Record<string, string | number | boolean> = {
        EMAIL_PROVIDER: 'resend',
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_SECURE: false,
        EMAIL_FROM: 'noreply@countergank.com',
        RESEND_FROM_EMAIL: 'resend@countergank.com',
      };
      return values[key];
    });

    const provider = await factory.createProvider();
    expect(provider).toBeInstanceOf(ResendProvider);
  });

  it('should throw for unsupported provider', async () => {
    mockParameterService.get.mockImplementation(async (key: string) => {
      const values: Record<string, string | number | boolean> = {
        EMAIL_PROVIDER: 'sendgrid',
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: 587,
        EMAIL_SECURE: false,
        EMAIL_FROM: 'noreply@countergank.com',
        RESEND_FROM_EMAIL: 'noreply@countergank.com',
      };
      return values[key];
    });

    await expect(factory.createProvider()).rejects.toThrow(/Unsupported email provider/);
  });
});
