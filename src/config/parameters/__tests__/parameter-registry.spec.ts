import { ParameterRegistry } from '../parameter-registry';
import { ParameterDefinition } from '../parameter.types';

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
});