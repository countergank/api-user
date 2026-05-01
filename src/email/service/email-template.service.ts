import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { EmailTemplate } from '../entities/email-template.entity';
import { EmailTemplateRepository } from '../repository/email-template.repository';

interface DefaultTemplate {
  slug: string;
  name: string;
  subject: string;
  contentFile: string;
  variables: string[];
}

const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    slug: 'welcome',
    name: 'Welcome / Email Verification',
    subject: 'Bienvenido {{userName}} — Verifica tu cuenta',
    contentFile: 'welcome.html',
    variables: ['userName', 'verificationLink'],
  },
  {
    slug: 'password-reset',
    name: 'Password Reset',
    subject: 'Recuperación de contraseña',
    contentFile: 'password-reset.html',
    variables: ['userName', 'resetLink'],
  },
  {
    slug: 'email-change',
    name: 'Email Change Confirmation',
    subject: 'Confirmación de cambio de email',
    contentFile: 'email-change.html',
    variables: ['userName', 'confirmationLink'],
  },
  {
    slug: 'password-changed',
    name: 'Password Changed Notification',
    subject: 'Tu contraseña fue cambiada',
    contentFile: 'password-changed.html',
    variables: ['userName'],
  },
];

@Injectable()
export class EmailTemplateService {
  constructor(private readonly repository: EmailTemplateRepository) {}

  async create(dto: CreateTemplateDto): Promise<EmailTemplate> {
    const exists = await this.repository.existsBySlug(dto.slug);
    if (exists) {
      throw new ConflictException(`Template with slug "${dto.slug}" already exists`);
    }

    return this.repository.create({
      name: dto.name,
      slug: dto.slug,
      subject: dto.subject,
      content: dto.content,
      variables: dto.variables || [],
      imageUrl: dto.imageUrl,
      isActive: true,
      version: 1,
    });
  }

  async findAll(): Promise<EmailTemplate[]> {
    return this.repository.findAll();
  }

  async findActive(): Promise<EmailTemplate[]> {
    return this.repository.findActive();
  }

  async findBySlug(slug: string): Promise<EmailTemplate> {
    const template = await this.repository.findBySlug(slug);
    if (!template) {
      throw new NotFoundException(`Template "${slug}" not found`);
    }
    return template;
  }

  async update(slug: string, dto: UpdateTemplateDto): Promise<EmailTemplate> {
    const updated = await this.repository.updateBySlug(slug, dto);
    if (!updated) {
      throw new NotFoundException(`Template "${slug}" not found`);
    }
    return updated;
  }

  async delete(slug: string): Promise<void> {
    const deleted = await this.repository.deleteBySlug(slug);
    if (!deleted) {
      throw new NotFoundException(`Template "${slug}" not found`);
    }
  }

  async resolve(slug: string): Promise<EmailTemplate> {
    // Try DB first
    const dbTemplate = await this.repository.findBySlug(slug);
    if (dbTemplate) {
      return dbTemplate;
    }

    // Fall back to default
    const defaultDef = DEFAULT_TEMPLATES.find((t) => t.slug === slug);
    if (!defaultDef) {
      throw new NotFoundException(`Template "${slug}" not found in database and no default exists`);
    }

    // Load embedded HTML and create a virtual template
    const content = this.loadDefaultHtml(defaultDef.contentFile);
    return {
      id: `default-${defaultDef.slug}`,
      name: defaultDef.name,
      slug: defaultDef.slug,
      subject: defaultDef.subject,
      content,
      variables: defaultDef.variables,
      isActive: true,
      version: 0,
    } as EmailTemplate;
  }

  render(template: EmailTemplate, variables: Record<string, string> = {}): { subject: string; html: string } {
    const subject = this.substituteVariables(template.subject, variables);
    const html = this.substituteVariables(template.content, variables);
    return { subject, html };
  }

  async seedDefaults(): Promise<void> {
    for (const def of DEFAULT_TEMPLATES) {
      const exists = await this.repository.existsBySlug(def.slug);
      if (!exists) {
        const content = this.loadDefaultHtml(def.contentFile);
        await this.repository.create({
          name: def.name,
          slug: def.slug,
          subject: def.subject,
          content,
          variables: def.variables,
          isActive: true,
          version: 1,
        });
      }
    }
  }

  private substituteVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      return variables[key] !== undefined ? variables[key] : _match;
    });
  }

  private loadDefaultHtml(filename: string): string {
    const distPath = path.join(process.cwd(), 'dist', 'email', 'templates', 'defaults', filename);
    const srcPath = path.join(process.cwd(), 'src', 'email', 'templates', 'defaults', filename);

    if (fs.existsSync(distPath)) {
      return fs.readFileSync(distPath, 'utf-8');
    }
    if (fs.existsSync(srcPath)) {
      return fs.readFileSync(srcPath, 'utf-8');
    }

    throw new BadRequestException(`Default template file "${filename}" not found`);
  }
}
