import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailService } from '../service/email.service';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../constants/email.tokens';
import { EmailLogRepository } from '../repository/email-log.repository';
import { EmailTemplateService } from '../service/email-template.service';
import { AppConfigService } from '../../config/app-config.service';

describe(EmailService.name, () => {
  let service: EmailService;

  const mockProvider: EmailProvider = {
    send: jest.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
  };

  const mockTemplateService = {
    resolve: jest.fn().mockResolvedValue({ subject: 'Test', html: '<p>Test</p>' }),
    render: jest.fn().mockReturnValue({ subject: 'Rendered', html: '<p>Rendered</p>' }),
  };

  const mockLogRepository = {
    create: jest.fn().mockResolvedValue({ id: 'log-1' }),
    update: jest.fn(),
  };

  const mockEventEmitter = {
    on: jest.fn(),
    emit: jest.fn(),
  };

  const mockConfigService = {
    get emailProvider() {
      return 'resend';
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: EMAIL_PROVIDER_TOKEN, useValue: mockProvider },
        { provide: EmailTemplateService, useValue: mockTemplateService },
        { provide: EmailLogRepository, useValue: mockLogRepository },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendBySlug', () => {
    it('should use emailProvider from AppConfigService for log entry', async () => {
      await service.sendBySlug('welcome', 'user@example.com', { userName: 'John' }, 'en');

      expect(mockLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'resend',
        }),
      );
    });

    it('should use default smtp when AppConfigService returns default value', async () => {
      const defaultConfigService = {
        get emailProvider() {
          return 'smtp';
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          EmailService,
          { provide: EMAIL_PROVIDER_TOKEN, useValue: mockProvider },
          { provide: EmailTemplateService, useValue: mockTemplateService },
          { provide: EmailLogRepository, useValue: mockLogRepository },
          { provide: EventEmitter2, useValue: mockEventEmitter },
          { provide: AppConfigService, useValue: defaultConfigService },
        ],
      }).compile();

      const svc = module.get<EmailService>(EmailService);
      await svc.sendBySlug('welcome', 'user@example.com', { userName: 'John' }, 'en');

      expect(mockLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'smtp',
        }),
      );
    });
  });

  describe('sendDirect', () => {
    it('should use emailProvider from AppConfigService for log entry', async () => {
      await service.sendDirect('user@example.com', 'Test', '<p>Test</p>');

      expect(mockLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'resend',
        }),
      );
    });
  });
});
