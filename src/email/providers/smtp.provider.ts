import * as nodemailer from 'nodemailer';
import { EmailProvider, EmailSendParams, EmailSendResult } from '../interfaces/email-provider.interface';

export class SmtpProvider implements EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!host || !port || !user || !pass) {
      throw new Error('EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS are required when using SMTP provider');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass },
    });
  }

  async send(params: EmailSendParams): Promise<EmailSendResult> {
    try {
      const info = await this.transporter.sendMail({
        from: params.from || process.env.EMAIL_FROM,
        to: params.to,
        subject: params.subject,
        html: params.html,
        replyTo: params.replyTo,
      });

      return { success: true, messageId: info.messageId || undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
