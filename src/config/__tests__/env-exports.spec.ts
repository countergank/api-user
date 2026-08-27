import { EnvironmentVariables, Environment } from '../env.validation';

describe('env.validation exports', () => {
  it('should export EnvironmentVariables class', () => {
    expect(EnvironmentVariables).toBeDefined();
    expect(typeof EnvironmentVariables).toBe('function');
  });

  it('should export Environment enum', () => {
    expect(Environment).toBeDefined();
    expect(Environment.DEVELOPMENT).toBe('development');
    expect(Environment.PRODUCTION).toBe('production');
    expect(Environment.TEST).toBe('test');
  });
});
