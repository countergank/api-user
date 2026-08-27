import { createStandaloneLogger } from './logger';

describe('createStandaloneLogger', () => {
  it('should return a pino logger instance with standard methods', () => {
    const logger = createStandaloneLogger('TestContext');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should accept custom options without error', () => {
    const { Writable } = require('node:stream');
    const stream = new Writable({
      write(_chunk: Buffer, _encoding: string, cb: () => void) {
        cb();
      },
    });

    const logger = createStandaloneLogger('TestCustom', { stream, level: 'silent' });
    expect(logger).toBeDefined();
    expect(logger.level).toBe('silent');
  });

  it('should redact password fields in log output', () => {
    const { Writable } = require('node:stream');
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    });

    const logger = createStandaloneLogger('TestRedaction', { stream, level: 'info' });
    logger.info({ password: 'secret123', user: 'test' }, 'login attempt');

    // Give pino a tick to flush
    const output = Buffer.concat(chunks).toString('utf-8');
    const parsed = JSON.parse(output.trim());

    expect(parsed.password).toBe('[Redacted]');
    expect(parsed.user).toBe('test');
    expect(parsed.msg).toBe('login attempt');
  });

  it('should redact authorization header in log output', () => {
    const { Writable } = require('node:stream');
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    });

    const logger = createStandaloneLogger('TestAuth', { stream, level: 'info' });
    logger.info({ authorization: 'Bearer token123' }, 'request');

    const output = Buffer.concat(chunks).toString('utf-8');
    const parsed = JSON.parse(output.trim());

    expect(parsed.authorization).toBe('[Redacted]');
  });

  it('should redact token and refreshToken fields', () => {
    const { Writable } = require('node:stream');
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    });

    const logger = createStandaloneLogger('TestTokens', { stream, level: 'info' });
    logger.info({ token: 'abc', refreshToken: 'xyz', data: 'ok' }, 'tokens');

    const output = Buffer.concat(chunks).toString('utf-8');
    const parsed = JSON.parse(output.trim());

    expect(parsed.token).toBe('[Redacted]');
    expect(parsed.refreshToken).toBe('[Redacted]');
    expect(parsed.data).toBe('ok');
  });

  it('should respect custom log level', () => {
    const { Writable } = require('node:stream');
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    });

    const logger = createStandaloneLogger('TestLevel', { stream, level: 'warn' });
    logger.info('should not appear');
    logger.warn('should appear');

    const output = Buffer.concat(chunks).toString('utf-8');
    const lines = output.trim().split('\n').filter(Boolean);

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.msg).toBe('should appear');
  });

  it('should produce output with level, msg, and time fields', () => {
    const { Writable } = require('node:stream');
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk: Buffer, _encoding: string, cb: () => void) {
        chunks.push(chunk);
        cb();
      },
    });

    const logger = createStandaloneLogger('TestFields', { stream, level: 'info' });
    logger.info('test message');

    const output = Buffer.concat(chunks).toString('utf-8');
    const parsed = JSON.parse(output.trim());

    expect(parsed).toHaveProperty('level');
    expect(parsed).toHaveProperty('msg', 'test message');
    expect(parsed).toHaveProperty('time');
  });
});
