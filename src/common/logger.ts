import pino, { type Logger as PinoLogger, type LoggerOptions } from 'pino';

const REDACT_PATHS = [
  'password',
  'token',
  'refreshToken',
  'authorization',
  'req.headers.authorization',
  'req.body.password',
  'req.body.token',
  'req.body.refreshToken',
];

/**
 * Creates a standalone pino logger for use outside NestJS DI context
 * (e.g., seed scripts, CLI tools). Shares the same redaction config
 * as the global nestjs-pino logger.
 */
export function createStandaloneLogger(
  context: string,
  options?: LoggerOptions & { stream?: NodeJS.WritableStream },
): PinoLogger {
  const { stream, ...pinoOptions } = options || {};

  const resolvedLevel =
    pinoOptions.level ??
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === 'test' && process.env.DEBUG !== 'true' ? 'silent' : 'info');

  const logger = pino(
    {
      ...pinoOptions,
      level: resolvedLevel,
      redact: {
        paths: REDACT_PATHS,
        censor: '[Redacted]',
      },
      base: { context },
    },
    stream,
  );

  return logger;
}
