import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VersionNotFoundError } from './common/errors/root/version-not-found.error';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getVersionV1(): string {
    let tag = undefined;
    const version = this.configService.get('VERSION');
    const node_env = this.configService.get('NODE_ENV');
    if (!version || !node_env) {
      throw new VersionNotFoundError();
    }
    tag = `${node_env}-${version}`;
    return `User Manager API v=${tag}`;
  }
}
