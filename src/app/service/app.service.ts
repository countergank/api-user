import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppVersionNotFoundError } from '../errors/app-version-not-found.error';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  async getVersionV1(): Promise<string> {
    let tag = undefined;
    const version = this.configService.getOrThrow('VERSION');
    const node_env = this.configService.getOrThrow('NODE_ENV');
    if (!version || !node_env) {
      throw new AppVersionNotFoundError();
    }
    tag = `${node_env}-${version}`;
    return `User Manager API v=${String(tag)}`;
  }
}
