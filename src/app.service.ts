import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { VersionNotFoundError } from './common/errors/version-not-found.error';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getVersion(): string {
    try {
      // Lee el contenido del archivo package.json
      const packageJson = fs.readFileSync('package.json', 'utf-8');

      // Analiza el archivo JSON y obtén la versión
      const packageData = JSON.parse(packageJson);
      const version = packageData.version;
      const env = this.configService.get('NODE_ENV');

      return `User Manager API. v${version}.${env}`;
    } catch (error) {
      throw new VersionNotFoundError();
    }
  }
}
