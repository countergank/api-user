import 'reflect-metadata';
import { validate } from './env.validation';

describe('Environment Validation - Audit Config', () => {
  const baseEnv = {
    NODE_ENV: 'test',
    VERSION: '1.0.0',
    DATABASE_USER: 'root',
    DATABASE_PASSWORD: 'pass',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '27017',
    DATABASE_NAME: 'test',
    ENCRYPTION_PASSWORD: 'test_encryption_password_32chars!',
  };

  describe('AUDIT_ENABLED', () => {
    it('should accept AUDIT_ENABLED=true', () => {
      const config = { ...baseEnv, AUDIT_ENABLED: 'true' };
      expect(() => validate(config)).not.toThrow();
    });

    it('should accept AUDIT_ENABLED=false', () => {
      const config = { ...baseEnv, AUDIT_ENABLED: 'false' };
      expect(() => validate(config)).not.toThrow();
    });

    it('should default AUDIT_ENABLED to true when not provided', () => {
      const validated = validate(baseEnv) as unknown as Record<string, unknown>;
      expect(validated.AUDIT_ENABLED).toBe('true');
    });

    it('should reject invalid AUDIT_ENABLED value', () => {
      const config = { ...baseEnv, AUDIT_ENABLED: 'invalid' };
      expect(() => validate(config)).toThrow();
    });
  });

  describe('AUDIT_RETENTION_DAYS', () => {
    it('should accept valid positive integer', () => {
      const config = { ...baseEnv, AUDIT_RETENTION_DAYS: '90' };
      expect(() => validate(config)).not.toThrow();
    });

    it('should default to 30 when not provided', () => {
      const validated = validate(baseEnv) as unknown as Record<string, unknown>;
      expect(validated.AUDIT_RETENTION_DAYS).toBe('30');
    });

    it('should reject negative value', () => {
      const config = { ...baseEnv, AUDIT_RETENTION_DAYS: '-5' };
      expect(() => validate(config)).toThrow();
    });

    it('should reject zero', () => {
      const config = { ...baseEnv, AUDIT_RETENTION_DAYS: '0' };
      expect(() => validate(config)).toThrow();
    });

    it('should reject non-numeric value', () => {
      const config = { ...baseEnv, AUDIT_RETENTION_DAYS: 'abc' };
      expect(() => validate(config)).toThrow();
    });
  });

  describe('AUDIT_LEVEL', () => {
    it('should accept minimal', () => {
      const config = { ...baseEnv, AUDIT_LEVEL: 'minimal' };
      expect(() => validate(config)).not.toThrow();
    });

    it('should accept standard', () => {
      const config = { ...baseEnv, AUDIT_LEVEL: 'standard' };
      expect(() => validate(config)).not.toThrow();
    });

    it('should accept verbose', () => {
      const config = { ...baseEnv, AUDIT_LEVEL: 'verbose' };
      expect(() => validate(config)).not.toThrow();
    });

    it('should default to standard when not provided', () => {
      const validated = validate(baseEnv) as unknown as Record<string, unknown>;
      expect(validated.AUDIT_LEVEL).toBe('standard');
    });

    it('should reject invalid value', () => {
      const config = { ...baseEnv, AUDIT_LEVEL: 'invalid' };
      expect(() => validate(config)).toThrow();
    });
  });
});
