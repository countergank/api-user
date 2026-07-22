import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL');
  }

  get emailProvider(): string {
    return this.config.get<string>('EMAIL_PROVIDER') ?? 'smtp';
  }

  get throttle(): { ttl: string; limit: string } {
    return {
      ttl: this.config.get<string>('THROTTLE_TTL'),
      limit: this.config.get<string>('THROTTLE_LIMIT'),
    };
  }
}
