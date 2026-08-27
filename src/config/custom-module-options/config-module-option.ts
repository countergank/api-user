import { isProd } from '../../common/utils';
import { validate } from '../env.validation';

// Jest sets JEST_WORKER_ID in every test worker. When present, ignore .env
// files so @nestjs/config uses process.env values injected by jest.setup.ts
// (which point to localhost, not docker-internal hostnames like db-user).
const isTestRunner = !!process.env.JEST_WORKER_ID;

export const ConfigModuleOption = {
  isGlobal: true,
  cache: true,
  envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
  ignoreEnvFile: !!isProd() || isTestRunner,
  validate: validate,
};
