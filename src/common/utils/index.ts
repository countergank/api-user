export const isProd = () => {
  return process.env.NODE_ENV === 'production';
};
export const isTest = () => {
  return process.env.NODE_ENV === 'test';
};
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development';
};
