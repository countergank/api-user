import 'reflect-metadata';
import { validate } from './env.validation';

const validConfig: Record<string, unknown> = {
  NODE_ENV: 'local',
  VERSION: '1.0.0',
  DATABASE_USER: 'root',
  DATABASE_PASSWORD: 'password',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '27017',
  DATABASE_NAME: 'test_db',
  ENCRYPTION_PASSWORD: 'test_encryption_password_32chars!',
  JWT_SECRET: 'super-secret-jwt-key',
  CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
};

describe('env validation', () => {
  describe('JWT_SECRET', () => {
    it('should throw when JWT_SECRET is missing', () => {
      const { JWT_SECRET, ...configWithoutJwt } = validConfig;
      expect(() => validate(configWithoutJwt)).toThrow();
    });

    it('should throw when JWT_SECRET is empty string', () => {
      expect(() =>
        validate({ ...validConfig, JWT_SECRET: '' }),
      ).toThrow();
    });

    it('should pass when JWT_SECRET is set to a non-empty string', () => {
      expect(() => validate(validConfig)).not.toThrow();
    });
  });

  describe('CORS_ORIGINS', () => {
    it('should throw when CORS_ORIGINS is missing', () => {
      const { CORS_ORIGINS, ...configWithoutCors } = validConfig;
      expect(() => validate(configWithoutCors)).toThrow();
    });

    it('should throw when CORS_ORIGINS is empty string', () => {
      expect(() =>
        validate({ ...validConfig, CORS_ORIGINS: '' }),
      ).toThrow();
    });

    it('should pass when CORS_ORIGINS is set to a non-empty string', () => {
      expect(() => validate(validConfig)).not.toThrow();
    });
  });

  describe('LOG_LEVEL', () => {
    it('should pass when LOG_LEVEL is not set (optional)', () => {
      expect(() => validate(validConfig)).not.toThrow();
    });

    it('should pass when LOG_LEVEL is a valid pino level', () => {
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'debug' })).not.toThrow();
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'info' })).not.toThrow();
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'warn' })).not.toThrow();
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'error' })).not.toThrow();
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'fatal' })).not.toThrow();
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'trace' })).not.toThrow();
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'silent' })).not.toThrow();
    });

    it('should throw when LOG_LEVEL is an invalid value', () => {
      expect(() => validate({ ...validConfig, LOG_LEVEL: 'invalid' })).toThrow();
    });
  });
});
