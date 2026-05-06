import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EmailProvider } from '../interfaces/email-provider.interface';
import { EMAIL_PROVIDER_TOKEN } from '../constants/email.tokens';
import { EmailLogRepository } from '../repository/email-log.repository';
import { EmailTemplateService } from './email-template.service';

export interface EmailSendEvent {
  to: string;
  subject: string;
  html: string;
  logId: string;
  from?: string;
  replyTo?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject(EMAIL_PROVIDER_TOKEN)
    private readonly provider: EmailProvider,
    private readonly templateService: EmailTemplateService,
    private readonly logRepository: EmailLogRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.eventEmitter.on('email.send', async (event: EmailSendEvent) => {
      try {
        await this.processSend(event);
      } catch (error) {
        this.logger.error(`Failed to send email to ${event.to}: ${error}`, (error as any)?.stack);
      }
    });
  }

  async sendBySlug(slug: string, to: string, variables: Record<string, string> = {}): Promise<{ status: string }> {
    const template = await this.templateService.resolve(slug);
    const { subject, html } = this.templateService.render(template, variables);

    const log = await this.logRepository.create({
      recipient: to,
      templateSlug: slug,
      subject,
      provider: this.getProviderName(),
      status: 'pending',
    });

    this.eventEmitter.emit('email.send', {
      to,
      subject,
      html,
      logId: log.id,
    } as EmailSendEvent);

    return { status: 'queued' };
  }

  async sendDirect(
    to: string,
    subject: string,
    html: string,
    metadata?: Record<string, unknown>,
    from?: string,
    replyTo?: string,
  ): Promise<{ status: string }> {
    const log = await this.logRepository.create({
      recipient: to,
      subject,
      provider: this.getProviderName(),
      status: 'pending',
      metadata,
    });

    this.eventEmitter.emit('email.send', {
      to,
      subject,
      html,
      logId: log.id,
      from,
      replyTo,
    } as EmailSendEvent);

    return { status: 'queued' };
  }

  private async processSend(event: EmailSendEvent): Promise<void> {
    const result = await this.provider.send({
      to: event.to,
      subject: event.subject,
      html: event.html,
      from: event.from,
      replyTo: event.replyTo,
    });

    await this.logRepository.update(event.logId, {
      status: result.success ? 'sent' : 'failed',
      messageId: result.messageId,
      error: result.error,
    });
  }

  private getProviderName(): string {
    return process.env.EMAIL_PROVIDER || 'smtp';
  }
}
