import { EmailProvider } from './interfaces/email-provider.interface';
import { ResendProvider } from './providers/resend.provider';
import { SmtpProvider } from './providers/smtp.provider';

const PROVIDER_MAP: Record<string, new () => EmailProvider> = {
  resend: ResendProvider,
  smtp: SmtpProvider,
};

export function createEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || getDefaultProvider();

  const ProviderClass = PROVIDER_MAP[provider];
  if (!ProviderClass) {
    throw new Error(`Unsupported email provider: "${provider}". Supported: ${Object.keys(PROVIDER_MAP).join(', ')}`);
  }

  return new ProviderClass();
}

function getDefaultProvider(): string {
  const env = process.env.NODE_ENV;
  if (env === 'local' || env === 'development') {
    return 'smtp';
  }
  return 'resend';
}
