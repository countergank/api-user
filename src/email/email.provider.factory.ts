import { Injectable } from '@nestjs/common';
import { ParameterService } from '../config/parameters/parameter.service';
import { EmailProvider } from './interfaces/email-provider.interface';
import { ResendProvider } from './providers/resend.provider';
import { SmtpProvider } from './providers/smtp.provider';

@Injectable()
export class EmailProviderFactory {
  constructor(private readonly parameterService: ParameterService) {}

  async createProvider(): Promise<EmailProvider> {
    const provider = ((await this.parameterService.get('EMAIL_PROVIDER')) as string) || getDefaultProvider();

    const host = (await this.parameterService.get('EMAIL_HOST')) as string;
    const port = Number(await this.parameterService.get('EMAIL_PORT'));
    const secure = (await this.parameterService.get('EMAIL_SECURE')) as boolean;
    const fromEmail = (await this.parameterService.get('EMAIL_FROM')) as string;

    if (provider === 'smtp') {
      return new SmtpProvider({ host, port, secure, fromEmail });
    }

    if (provider === 'resend') {
      const resendFromEmail =
        ((await this.parameterService.get('RESEND_FROM_EMAIL')) as string) || fromEmail;
      return new ResendProvider({ fromEmail: resendFromEmail });
    }

    throw new Error(`Unsupported email provider: "${provider}". Supported: smtp, resend`);
  }
}

function getDefaultProvider(): string {
  const env = process.env.NODE_ENV;
  if (env === 'local' || env === 'development') {
    return 'smtp';
  }
  return 'resend';
}
