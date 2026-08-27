import { ParameterRegistry } from '../parameter-registry';
import { ParameterDefinition } from '../parameter.types';
import { PARAMETER_DEFINITIONS } from '../parameter-definitions';

describe('ParameterRegistry', () => {
  let registry: ParameterRegistry;

  beforeEach(() => {
    registry = new ParameterRegistry();
  });

  describe('register', () => {
    it('should register a parameter with defaults', () => {
      const param: ParameterDefinition = {
        key: 'EMAIL_PROVIDER',
        type: 'string',
        default: 'smtp',
        group: 'email',
        ttl: 300,
      };
      registry.register(param);
      const retrieved = registry.findByKey('EMAIL_PROVIDER');
      expect(retrieved).toEqual(param);
    });

    it('should reject duplicate parameter key', () => {
      const param1: ParameterDefinition = {
        key: 'EMAIL_PROVIDER',
        type: 'string',
        default: 'smtp',
        group: 'email',
        ttl: 300,
      };
      const param2: ParameterDefinition = {
        key: 'EMAIL_PROVIDER',
        type: 'string',
        default: 'sendgrid',
        group: 'email',
        ttl: 300,
      };
      registry.register(param1);
      expect(() => registry.register(param2)).toThrowError(/already registered/);
    });

    it('should reject invalid type', () => {
      const param = {
        key: 'INVALID',
        type: 'json',
        default: {},
        group: 'test',
        ttl: 60,
      } as unknown as ParameterDefinition;
      expect(() => registry.register(param)).toThrowError(/Invalid type/);
    });
  });

  describe('findByGroup', () => {
    it('should list parameters by group', () => {
      const emailParam: ParameterDefinition = {
        key: 'EMAIL_PROVIDER',
        type: 'string',
        default: 'smtp',
        group: 'email',
        ttl: 300,
      };
      const authParam: ParameterDefinition = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
      };
      registry.register(emailParam);
      registry.register(authParam);
      const emailParams = registry.findByGroup('email');
      expect(emailParams).toHaveLength(1);
      expect(emailParams[0].key).toBe('EMAIL_PROVIDER');
    });

    it('should list all groups', () => {
      const emailParam: ParameterDefinition = {
        key: 'EMAIL_PROVIDER',
        type: 'string',
        default: 'smtp',
        group: 'email',
        ttl: 300,
      };
      const authParam: ParameterDefinition = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
      };
      const rateParam: ParameterDefinition = {
        key: 'RATE_LIMIT',
        type: 'number',
        default: 100,
        group: 'rate-limit',
        ttl: 300,
      };
      registry.register(emailParam);
      registry.register(authParam);
      registry.register(rateParam);
      const groups = registry.listGroups();
      expect(groups).toEqual(['email', 'auth', 'rate-limit']);
    });
  });

  describe('findByKey', () => {
    it('should return parameter definition for registered key', () => {
      const param: ParameterDefinition = {
        key: 'APP_NAME',
        type: 'string',
        default: 'my-app',
        group: 'app',
        ttl: 300,
      };
      registry.register(param);
      const result = registry.findByKey('APP_NAME');
      expect(result).toEqual(param);
    });

    it('should return undefined for unregistered key', () => {
      const result = registry.findByKey('NONEXISTENT');
      expect(result).toBeUndefined();
    });
  });

  describe('get', () => {
    it('should return parameter definition via get alias', () => {
      const param: ParameterDefinition = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
      };
      registry.register(param);
      const result = registry.get('MAX_LOGIN_ATTEMPTS');
      expect(result).toEqual(param);
    });

    it('should return undefined for unregistered key via get', () => {
      const result = registry.get('NONEXISTENT');
      expect(result).toBeUndefined();
    });

    it('should return same result as findByKey', () => {
      const param: ParameterDefinition = {
        key: 'APP_NAME',
        type: 'string',
        default: 'my-app',
        group: 'app',
        ttl: 300,
      };
      registry.register(param);
      expect(registry.get('APP_NAME')).toEqual(registry.findByKey('APP_NAME'));
    });
  });

  describe('getAll', () => {
    it('should return all registered parameters', () => {
      const param1: ParameterDefinition = {
        key: 'EMAIL_PROVIDER',
        type: 'string',
        default: 'smtp',
        group: 'email',
        ttl: 300,
      };
      const param2: ParameterDefinition = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
      };
      registry.register(param1);
      registry.register(param2);
      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toEqual([param1, param2]);
    });

    it('should return empty array when no parameters registered', () => {
      const all = registry.getAll();
      expect(all).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should validate value against custom rule', () => {
      const param: ParameterDefinition = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
        validate: (v) => (v as number) > 0 && (v as number) <= 100,
      };
      registry.register(param);
      expect(() => registry.validate('MAX_LOGIN_ATTEMPTS', 5)).not.toThrow();
    });

    it('should reject invalid value', () => {
      const param: ParameterDefinition = {
        key: 'MAX_LOGIN_ATTEMPTS',
        type: 'number',
        default: 5,
        group: 'auth',
        ttl: 300,
        validate: (v) => (v as number) > 0 && (v as number) <= 100,
      };
      registry.register(param);
      expect(() => registry.validate('MAX_LOGIN_ATTEMPTS', -1)).toThrowError(/validation failed/);
    });

    it('should skip validation when no rule defined', () => {
      const param: ParameterDefinition = {
        key: 'APP_NAME',
        type: 'string',
        default: 'my-app',
        group: 'app',
        ttl: 300,
      };
      registry.register(param);
      expect(() => registry.validate('APP_NAME', 'any-value')).not.toThrow();
    });
  });

  describe('PARAMETER_DEFINITIONS', () => {
    it('should have 14 entries (1 existing + 13 new)', () => {
      expect(PARAMETER_DEFINITIONS).toHaveLength(14);
    });

    it('should contain all required parameter keys', () => {
      const keys = PARAMETER_DEFINITIONS.map((d) => d.key).sort();
      expect(keys).toEqual(
        [
          'EMAIL_PROVIDER',
          'EMAIL_HOST',
          'EMAIL_PORT',
          'EMAIL_SECURE',
          'EMAIL_FROM',
          'RESEND_FROM_EMAIL',
          'THROTTLE_LIMIT',
          'THROTTLE_TTL',
          'LOGIN_THROTTLE_LIMIT',
          'LOGIN_THROTTLE_TTL',
          'REGISTER_THROTTLE_LIMIT',
          'REGISTER_THROTTLE_TTL',
          'FORGOT_PASSWORD_THROTTLE_LIMIT',
          'FORGOT_PASSWORD_THROTTLE_TTL',
        ].sort(),
      );
    });

    it('should group email params correctly', () => {
      const emailParams = PARAMETER_DEFINITIONS.filter((d) => d.group === 'email');
      const keys = emailParams.map((d) => d.key).sort();
      expect(keys).toEqual(
        ['EMAIL_PROVIDER', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_SECURE', 'EMAIL_FROM', 'RESEND_FROM_EMAIL'].sort(),
      );
    });

    it('should group throttle params correctly', () => {
      const throttleParams = PARAMETER_DEFINITIONS.filter((d) => d.group === 'throttle');
      const keys = throttleParams.map((d) => d.key).sort();
      expect(keys).toEqual(
        [
          'THROTTLE_LIMIT',
          'THROTTLE_TTL',
          'LOGIN_THROTTLE_LIMIT',
          'LOGIN_THROTTLE_TTL',
          'REGISTER_THROTTLE_LIMIT',
          'REGISTER_THROTTLE_TTL',
          'FORGOT_PASSWORD_THROTTLE_LIMIT',
          'FORGOT_PASSWORD_THROTTLE_TTL',
        ].sort(),
      );
    });

    it('should have correct types for each parameter', () => {
      const stringKeys = PARAMETER_DEFINITIONS.filter((d) => d.type === 'string').map((d) => d.key);
      const numberKeys = PARAMETER_DEFINITIONS.filter((d) => d.type === 'number').map((d) => d.key);
      const booleanKeys = PARAMETER_DEFINITIONS.filter((d) => d.type === 'boolean').map((d) => d.key);

      expect(stringKeys.sort()).toEqual(['EMAIL_PROVIDER', 'EMAIL_HOST', 'EMAIL_FROM', 'RESEND_FROM_EMAIL'].sort());
      expect(booleanKeys).toEqual(['EMAIL_SECURE']);
      expect(numberKeys.sort()).toEqual(
        [
          'EMAIL_PORT',
          'THROTTLE_LIMIT',
          'THROTTLE_TTL',
          'LOGIN_THROTTLE_LIMIT',
          'LOGIN_THROTTLE_TTL',
          'REGISTER_THROTTLE_LIMIT',
          'REGISTER_THROTTLE_TTL',
          'FORGOT_PASSWORD_THROTTLE_LIMIT',
          'FORGOT_PASSWORD_THROTTLE_TTL',
        ].sort(),
      );
    });

    it('should validate throttle params as integers >= 1', () => {
      const throttleNumberParams = PARAMETER_DEFINITIONS.filter(
        (d) => d.group === 'throttle' && d.type === 'number',
      );
      for (const param of throttleNumberParams) {
        // Should accept valid values
        expect(param.validate!(1)).toBe(true);
        expect(param.validate!(100)).toBe(true);
        // Should reject invalid values
        expect(param.validate!(0)).toBe(false);
        expect(param.validate!(-1)).toBe(false);
        expect(param.validate!(1.5)).toBe(false);
      }
    });

    it('should have all params with ttl set to 300', () => {
      for (const param of PARAMETER_DEFINITIONS) {
        expect(param.ttl).toBe(300);
      }
    });
  });
});