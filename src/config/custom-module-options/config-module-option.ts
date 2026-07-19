import { isProd } from '../../common/utils';
import { validate } from '../env.validation';

export const ConfigModuleOption = {
  isGlobal: true,
  cache: true,
  envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
  ignoreEnvFile: !!isProd(),
  validate: validate,
};
