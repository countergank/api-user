---
priority: P1
category: operations
---

# Prefer Fastify over Express as the HTTP platform

**Do**: Use `@nestjs/platform-fastify` with `FastifyAdapter` in `main.ts` for new projects. Fastify provides 2-3x better throughput than Express with lower memory usage.
**Avoid**: Defaulting to Express without evaluating Fastify for performance-sensitive applications. Express middleware is not compatible — use Fastify plugins instead.
**Example**:
```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: true }),
);
await app.listen(3000, '0.0.0.0');
```

Install: `npm i @nestjs/platform-fastify fastify`
