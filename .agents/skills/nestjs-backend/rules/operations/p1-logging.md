---
priority: P1
category: operations
---

# Use structured logging with correlation IDs

**Do**: Configure a logger (e.g., `pino` or `winston`) that outputs JSON with request correlation IDs, timestamps, and log levels for machine-readable log aggregation.
**Avoid**: Using `console.log` for production logging or emitting unstructured text that cannot be queried or filtered.
**Example** (Express path):
```typescript
app.useLogger(new LoggerService());

// In middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// In service
this.logger.log({ event: 'user_created', userId: user.id, requestId: req.id });
```
**Fastify note**: On Fastify, do not use Express middleware. Use Fastify's built-in logger or `nestjs-pino` (registered on the Fastify instance) for structured JSON logs with request IDs; correlation IDs ride on Fastify's request context instead of Express middleware.
