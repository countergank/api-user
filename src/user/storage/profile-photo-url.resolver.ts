import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { resolveProfilePhotoPublicUrl } from './profile-photo-storage';

@Injectable()
export class ProfilePhotoUrlResolver {
  constructor(private readonly configService: ConfigService) {}

  resolve(storedValue?: string): string | undefined {
    return resolveProfilePhotoPublicUrl(
      storedValue,
      this.configService.get<string>('STORAGE_PUBLIC_URL'),
      this.configService.get<string>('STORAGE_DRIVER'),
    );
  }
}
