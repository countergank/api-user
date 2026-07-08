import { buildLoggerConfig } from './logger-config';

describe('buildLoggerConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return pinoHttp config with redaction paths', () => {
    process.env.NODE_ENV = 'development';
    const config = buildLoggerConfig();

    expect(config.pinoHttp).toBeDefined();
    expect(config.pinoHttp.redact).toBeDefined();
    const redactPaths = config.pinoHttp.redact.paths;
    expect(redactPaths).toContain('req.headers.authorization');
    expect(redactPaths).toContain('req.body.password');
    expect(redactPaths).toContain('req.body.token');
    expect(redactPaths).toContain('req.body.refreshToken');
  });

  it('should use LOG_LEVEL from environment', () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_LEVEL = 'debug';
    const config = buildLoggerConfig();

    expect(config.pinoHttp.level).toBe('debug');
  });

  it('should default to info level when LOG_LEVEL is not set', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_LEVEL;
    const config = buildLoggerConfig();

    expect(config.pinoHttp.level).toBe('info');
  });

  it('should set silent level in test env when DEBUG is not true', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.DEBUG;
    delete process.env.LOG_LEVEL;
    const config = buildLoggerConfig();

    expect(config.pinoHttp.level).toBe('silent');
  });

  it('should respect LOG_LEVEL in test env when DEBUG=true', () => {
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'true';
    process.env.LOG_LEVEL = 'debug';
    const config = buildLoggerConfig();

    expect(config.pinoHttp.level).toBe('debug');
  });

  it('should default to info in test env when DEBUG=true but LOG_LEVEL not set', () => {
    process.env.NODE_ENV = 'test';
    process.env.DEBUG = 'true';
    delete process.env.LOG_LEVEL;
    const config = buildLoggerConfig();

    expect(config.pinoHttp.level).toBe('info');
  });

  it('should exclude /health from autoLogging', () => {
    process.env.NODE_ENV = 'development';
    const config = buildLoggerConfig();

    expect(config.pinoHttp.autoLogging).toBeDefined();
    expect(config.pinoHttp.autoLogging.ignore).toBeDefined();
    // The ignore function should return true for /health paths
    const mockRequest = { url: '/health', method: 'GET' };
    expect(config.pinoHttp.autoLogging.ignore(mockRequest)).toBe(true);
  });

  it('should not exclude non-health paths from autoLogging', () => {
    process.env.NODE_ENV = 'development';
    const config = buildLoggerConfig();

    const mockRequest = { url: '/api/users', method: 'GET' };
    expect(config.pinoHttp.autoLogging.ignore(mockRequest)).toBe(false);
  });

  it('should set useExisting to true for CLS integration', () => {
    process.env.NODE_ENV = 'development';
    const config = buildLoggerConfig();

    expect(config.useExisting).toBe(true);
  });

  it('should set redact censor to [Redacted]', () => {
    process.env.NODE_ENV = 'development';
    const config = buildLoggerConfig();

    expect(config.pinoHttp.redact.censor).toBe('[Redacted]');
  });
});
