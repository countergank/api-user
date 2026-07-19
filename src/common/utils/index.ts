import { Environment } from '../constrants';

export const isProd = () => {
  return process.env.NODE_ENV === Environment.PRODUCTION;
};
export const isTest = () => {
  return process.env.NODE_ENV === Environment.TEST;
};
export const isDevelopment = () => {
  return process.env.NODE_ENV === Environment.DEVELOPMENT;
};
export const isLocal = () => {
  return process.env.NODE_ENV === Environment.LOCAL;
};
