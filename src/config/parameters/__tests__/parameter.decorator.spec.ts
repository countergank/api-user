import { Parameter } from '../decorators/parameter.decorator';

describe('@Parameter decorator factory', () => {
  it('should return a ParameterDecorator function for a string key', () => {
    const decorator = Parameter('THROTTLE_LIMIT');
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('should return a ParameterDecorator with strict mode', () => {
    const decorator = Parameter('THROTTLE_LIMIT', { strict: true });
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });

  it('should return a ParameterDecorator that can be applied to a parameter', () => {
    const decorator = Parameter('EMAIL_HOST');
    // ParameterDecorator signature: (target, propertyKey, parameterIndex) => void
    const target = {};
    expect(() => decorator(target, 'testMethod', 0)).not.toThrow();
  });

  it('should return a valid decorator for each ParameterType', () => {
    expect(() => Parameter('EMAIL_HOST')).not.toThrow();
    expect(() => Parameter('THROTTLE_LIMIT')).not.toThrow();
    expect(() => Parameter('EMAIL_SECURE')).not.toThrow();
  });

  it('should return a valid decorator for unknown keys', () => {
    const decorator = Parameter('NONEXISTENT_KEY');
    expect(typeof decorator).toBe('function');
  });

  it('should return a valid decorator for unknown keys in strict mode', () => {
    const decorator = Parameter('NONEXISTENT_KEY', { strict: true });
    expect(typeof decorator).toBe('function');
  });

  it('should produce compatible ParameterDecorator with proper call signature', () => {
    const decorator = Parameter('EMAIL_PORT');
    const target = {};

    // Verify the decorator can be called with standard ParameterDecorator args
    const result = decorator(target, 'methodName', 0);
    expect(result).toBeUndefined();
  });
});
