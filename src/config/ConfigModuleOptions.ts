import { Injectable } from '@nestjs/common';
import { isProd } from '../common/utils';
import { validate } from './env.validation';

@Injectable()
export class ConfigModuleOptions {
  constructor() {
    return {
      isGlobal: true,
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
      ignoreEnvFile: isProd() ? true : false,
      validate: validate,
    };
  }
}
