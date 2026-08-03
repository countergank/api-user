import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplateRepository } from '../repository/email-template.repository';
import { I18nService } from '../../common/i18n/i18n.service';
import { DomainError } from '../../common/errors/domain.error';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { EmailTemplate } from '../entities/email-template.entity';
import * as fs from 'node:fs';

jest.mock('node:fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

/**
 * Assert that a promise rejects with a DomainError carrying the expected
 * ErrorKind. Fails when the promise resolves or when the rejected value is
 * not a DomainError with the exact kind.
 */
async function expectDomainError(promise: Promise<unknown>, kind: string): Promise<void> {
  let thrown: unknown;
  try {
    await promise;
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(DomainError);
  expect((thrown as DomainError).kind.kind).toBe(kind);
}

describe(EmailTemplateService.name, () => {
  let service: EmailTemplateService;

  const mockRepository = {
    findBySlug: jest.fn(),
    existsBySlug: jest.fn(),
    create: jest.fn(),
    updateBySlug: jest.fn(),
    deleteBySlug: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
  };

  const mockI18nService = {
    translate: jest.fn(),
    getLanguage: jest.fn(),
    setLanguage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockI18nService.getLanguage.mockReturnValue('es');
    mockI18nService.translate.mockResolvedValue('Translated subject');
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.readFileSync.mockReturnValue('<h1>Default</h1>');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTemplateService,
        { provide: EmailTemplateRepository, useValue: mockRepository },
        { provide: I18nService, useValue: mockI18nService },
      ],
    }).compile();

    service = module.get<EmailTemplateService>(EmailTemplateService);
  });

  describe('create', () => {
    it('should throw DomainError TEMPLATE_SLUG_ALREADY_EXISTS when slug already exists', async () => {
      mockRepository.existsBySlug.mockResolvedValue(true);

      const dto: CreateTemplateDto = {
        name: 'Welcome',
        slug: 'welcome',
        subject: 'Hello',
        content: '<p>Hi</p>',
      };

      await expectDomainError(service.create(dto), 'TEMPLATE_SLUG_ALREADY_EXISTS');
    });

    it('should create a template when slug is available', async () => {
      mockRepository.existsBySlug.mockResolvedValue(false);
      const created = { id: 'tpl-1', slug: 'welcome', name: 'Welcome' };
      mockRepository.create.mockResolvedValue(created);

      const dto: CreateTemplateDto = {
        name: 'Welcome',
        slug: 'welcome',
        subject: 'Hello',
        content: '<p>Hi</p>',
        variables: ['userName'],
        imageUrl: 'https://cdn.example.com/welcome.png',
      };

      await expect(service.create(dto)).resolves.toBe(created);
      expect(mockRepository.create).toHaveBeenCalledWith({
        name: 'Welcome',
        slug: 'welcome',
        subject: 'Hello',
        content: '<p>Hi</p>',
        variables: ['userName'],
        imageUrl: 'https://cdn.example.com/welcome.png',
        isActive: true,
        version: 1,
      });
    });

    it('should default variables to an empty array when not provided', async () => {
      mockRepository.existsBySlug.mockResolvedValue(false);
      mockRepository.create.mockResolvedValue({ id: 'tpl-2' });

      const dto: CreateTemplateDto = {
        name: 'Welcome',
        slug: 'welcome',
        subject: 'Hello',
        content: '<p>Hi</p>',
      };

      await service.create(dto);
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ variables: [] }));
    });
  });

  describe('findAll', () => {
    it('should return all templates from the repository', async () => {
      const templates = [{ id: 'a' }, { id: 'b' }];
      mockRepository.findAll.mockResolvedValue(templates);

      await expect(service.findAll()).resolves.toBe(templates);
      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findActive', () => {
    it('should return active templates from the repository', async () => {
      const templates = [{ id: 'active-1' }];
      mockRepository.findActive.mockResolvedValue(templates);

      await expect(service.findActive()).resolves.toBe(templates);
      expect(mockRepository.findActive).toHaveBeenCalledTimes(1);
    });
  });

  describe('findBySlug', () => {
    it('should throw DomainError TEMPLATE_NOT_FOUND when template does not exist', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expectDomainError(service.findBySlug('missing'), 'TEMPLATE_NOT_FOUND');
    });

    it('should return the template when it exists', async () => {
      const template = { id: 'tpl-1', slug: 'welcome' };
      mockRepository.findBySlug.mockResolvedValue(template);

      await expect(service.findBySlug('welcome')).resolves.toBe(template);
      expect(mockRepository.findBySlug).toHaveBeenCalledWith('welcome');
    });
  });

  describe('update', () => {
    it('should throw DomainError TEMPLATE_NOT_FOUND when template does not exist', async () => {
      mockRepository.updateBySlug.mockResolvedValue(null);

      const dto: UpdateTemplateDto = { name: 'Renamed' };

      await expectDomainError(service.update('missing', dto), 'TEMPLATE_NOT_FOUND');
    });

    it('should return the updated template when it exists', async () => {
      const updated = { id: 'tpl-1', slug: 'welcome', name: 'Renamed', version: 2 };
      mockRepository.updateBySlug.mockResolvedValue(updated);

      const dto: UpdateTemplateDto = { name: 'Renamed' };

      await expect(service.update('welcome', dto)).resolves.toBe(updated);
      expect(mockRepository.updateBySlug).toHaveBeenCalledWith('welcome', dto);
    });
  });

  describe('delete', () => {
    it('should throw DomainError TEMPLATE_NOT_FOUND when template does not exist', async () => {
      mockRepository.deleteBySlug.mockResolvedValue(false);

      await expectDomainError(service.delete('missing'), 'TEMPLATE_NOT_FOUND');
    });

    it('should resolve when template is deleted', async () => {
      mockRepository.deleteBySlug.mockResolvedValue(true);

      await expect(service.delete('welcome')).resolves.toBeUndefined();
      expect(mockRepository.deleteBySlug).toHaveBeenCalledWith('welcome');
    });
  });

  describe('resolve', () => {
    it('should throw DomainError TEMPLATE_NOT_FOUND when no DB template and no default exists', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expectDomainError(service.resolve('missing-template'), 'TEMPLATE_NOT_FOUND');
    });

    it('should return the DB template when it exists and language is the default language', async () => {
      const template = { id: 'tpl-1', slug: 'welcome', subject: 'DB subject', content: '<p>DB</p>' };
      mockRepository.findBySlug.mockResolvedValue(template);
      mockI18nService.getLanguage.mockReturnValue('es');

      await expect(service.resolve('welcome')).resolves.toBe(template);
    });

    it('should throw DomainError TEMPLATE_FILE_NOT_FOUND when the default file is missing', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);

      await expectDomainError(service.resolve('welcome', 'en'), 'TEMPLATE_FILE_NOT_FOUND');
    });

    it('should build a default template when no DB template but a default definition exists', async () => {
      mockRepository.findBySlug.mockResolvedValue(null);
      const html = '<h1>Welcome</h1>';
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(html);
      mockI18nService.translate.mockResolvedValue('Bienvenido');

      const result = await service.resolve('welcome', 'en');

      expect(result).toEqual(
        expect.objectContaining({
          id: 'default-welcome',
          name: 'Welcome / Email Verification',
          slug: 'welcome',
          subject: 'Bienvenido',
          content: html,
          isActive: true,
          version: 0,
        }),
      );
    });
  });

  describe('render', () => {
    it('should substitute variables in subject and content', () => {
      const template = {
        subject: 'Hello {{userName}}',
        content: '<p>Hi {{userName}}, link: {{verificationLink}}</p>',
      } as EmailTemplate;

      const result = service.render(template, {
        userName: 'John',
        verificationLink: 'https://example.com/verify',
      });

      expect(result).toEqual({
        subject: 'Hello John',
        html: '<p>Hi John, link: https://example.com/verify</p>',
      });
    });

    it('should leave unknown variables untouched', () => {
      const template = {
        subject: 'Hi {{userName}}',
        content: '<p>{{missing}}</p>',
      } as EmailTemplate;

      const result = service.render(template, { userName: 'Jane' });

      expect(result).toEqual({
        subject: 'Hi Jane',
        html: '<p>{{missing}}</p>',
      });
    });
  });

  describe('seedDefaults', () => {
    it('should create missing default templates', async () => {
      mockRepository.existsBySlug.mockResolvedValue(false);
      const html = '<h1>Default</h1>';
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(html);

      await service.seedDefaults();

      expect(mockRepository.create).toHaveBeenCalledTimes(4);
      expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ slug: 'welcome', content: html }));
    });

    it('should skip templates that already exist', async () => {
      mockRepository.existsBySlug.mockResolvedValue(true);

      await service.seedDefaults();

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });
});
