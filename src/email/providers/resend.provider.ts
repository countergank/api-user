import { Resend } from 'resend';
import { EmailProvider, EmailSendParams, EmailSendResult } from '../interfaces/email-provider.interface';

export class ResendProvider implements EmailProvider {
  private resend: Resend;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required when using Resend provider');
    }
    this.resend = new Resend(apiKey);
  }

  async send(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: params.from || process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
