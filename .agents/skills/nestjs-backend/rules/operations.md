# Operations — Priority P1–P2

Read this file when the task touches configuration loading, structured logging, health checks, or HTTP adapter plugins.

## P1 — Validate configuration at startup with ConfigModule

Import `ConfigModule.forRoot({ isGlobal: true, validate })` with a Joi or Zod schema that validates all required environment variables at startup, so a missing or malformed variable fails fast at boot instead of surfacing as a runtime failure on first use. Read configuration through the injected `ConfigService`, which returns the schema-parsed values every service depends on. Direct `process.env` access bypasses that validation and leaves misconfiguration undetected until the code path that needs the variable executes.

```typescript
// ✅ Schema-validated config, globally available through ConfigService
ConfigModule.forRoot({
  isGlobal: true,
  validate: (config: Record<string, unknown>) => {
    const schema = z.object({
      PORT: z.coerce.number().default(3000),
      DATABASE_URL: z.string().url(),
      JWT_SECRET: z.string().min(32),
    });
    return schema.parse(config);
  },
});
```

```typescript
// ❌ Direct process.env access skips startup validation
const port = process.env.PORT;
const secret = process.env.JWT_SECRET; // undefined — detected only on first use
```

## P1 — Log structured events with a correlation ID

Configure a logger (`pino` or `winston`) that outputs JSON with request correlation IDs, timestamps, and log levels, so log aggregation can query and filter machine-readable entries. Emit structured log entries for security-relevant events — authentication attempts, authorization failures, permission changes, and access to sensitive resources — alongside application events, giving incident investigation a complete audit trail instead of application error logs alone. On Fastify, register `nestjs-pino` on the Fastify instance so correlation IDs ride on Fastify's request context rather than Express middleware.

```typescript
// ✅ Structured entries: app events and security audit share the correlation ID
this.logger.log({ event: 'user_created', userId: user.id, requestId: req.id });
this.logger.log({
  event: 'access',
  userId: user.id,
  resource,
  action,
  requestId: req.id,
  timestamp: new Date().toISOString(),
});
```

```typescript
// ❌ Unstructured text that cannot be queried, filtered, or audited
console.log(`user ${user.id} accessed ${resource}`);
```

## P2 — Expose health checks for liveness and readiness

Use `@nestjs/terminus` to implement `/health` endpoints that verify database connectivity, external service availability, and memory usage. A health endpoint that exercises real dependencies gives the orchestrator the signal it needs to detect and recover from unhealthy instances; a static response reports the process as alive while its dependencies are down.

```typescript
// ✅ Terminus checks verify real dependencies
@Get('health')
@HealthCheck()
async healthCheck() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
  ]);
}
```

```typescript
// ❌ A static response hides dependency outages from the orchestrator
@Get('health')
health() {
  return { status: 'ok' };
}
```

## P2 — Use Fastify-native plugins instead of Express middleware

Register Fastify equivalents through `app.register()`: `@fastify/helmet` in place of `helmet`, `@fastify/cors` in place of `cors`, and `@fastify/compress` for response compression. File upload handling with Fastify uses `@fastify/multipart` in place of `multer`. Express middleware packages (`morgan`, `compression`, `cookie-parser`) do not work on the Fastify adapter and cause runtime errors.

```typescript
// ✅ Fastify plugins registered on the NestFastifyApplication
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
await app.register(fastifyHelmet);
await app.register(fastifyCors, { origin: 'https://example.com' });
```

```typescript
// ❌ Express middleware packages fail on the Fastify adapter
app.use(morgan('combined'));
app.use(compression());
```
