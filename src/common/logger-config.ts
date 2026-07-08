/**
 * Builds the nestjs-pino LoggerModule configuration.
 * Extracted for testability — consumed by AppModule.
 */
export function buildLoggerConfig() {
  const isTest = process.env.NODE_ENV === 'test';
  const isDebug = process.env.DEBUG === 'true';
  const level =
    process.env.LOG_LEVEL ??
    (isTest && !isDebug ? 'silent' : 'info');

  return {
    useExisting: true as const,
    pinoHttp: {
      level,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.body.password',
          'req.body.token',
          'req.body.refreshToken',
        ],
        censor: '[Redacted]',
      },
      autoLogging: {
        ignore: (req: { url?: string }) => req.url === '/health',
      },
    },
  };
}
