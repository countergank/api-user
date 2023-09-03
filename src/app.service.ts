import { Injectable } from '@nestjs/common';
import { env } from 'process';

@Injectable()
export class AppService {
  getHello(): string {
    return `User Manager API. Version: ${process.env.npm_package_version}`;
  }
}
