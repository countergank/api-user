import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VersionNotFoundError } from './common/errors/version-not-found.error';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getVersion(): string {
    try {
      const tag = this.configService.get('TAG');
      return `User Manager API. v=${tag}`;
    } catch (error) {
      throw new VersionNotFoundError();
    }
  }
}
