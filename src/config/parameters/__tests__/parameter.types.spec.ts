import { ParameterDefinition } from '../parameter.types';

describe('ParameterDefinition type', () => {
  it('should have required fields', () => {
    const param: ParameterDefinition = {
      key: 'EMAIL_PROVIDER',
      type: 'string',
      default: 'smtp',
      group: 'email',
      ttl: 300,
    };
    expect(param.key).toBe('EMAIL_PROVIDER');
    expect(param.type).toBe('string');
    expect(param.default).toBe('smtp');
    expect(param.group).toBe('email');
    expect(param.ttl).toBe(300);
  });

  it('should allow optional validate function', () => {
    const param: ParameterDefinition = {
      key: 'MAX_LOGIN_ATTEMPTS',
      type: 'number',
      default: 5,
      group: 'auth',
      ttl: 300,
      validate: (v) => (v as number) > 0 && (v as number) <= 100,
    };
    expect(param.validate).toBeDefined();
    expect(param.validate!(10)).toBe(true);
    expect(param.validate!(-1)).toBe(false);
  });

  it('should accept boolean type', () => {
    const param: ParameterDefinition = {
      key: 'EMAIL_SECURE',
      type: 'boolean',
      default: false,
      group: 'email',
      ttl: 300,
    };
    expect(param.type).toBe('boolean');
    expect(param.default).toBe(false);
  });
});