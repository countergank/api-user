---
priority: P2
category: operations
---

# Use Fastify-native plugins instead of Express middleware

**Do**: Replace Express-based middleware with Fastify equivalents: `@fastify/helmet` instead of `helmet`, `@fastify/cors` instead of `cors`, `@fastify/compress` for response compression. Use `app.register()` for plugin setup.
**Avoid**: Using Express middleware packages (`morgan`, `compression`, `cookie-parser`) with Fastify — they will not work or will cause runtime errors.
**Example**:
```typescript
// bootstrap with Fastify plugins
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';

const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter(),
);
await app.register(fastifyHelmet);
await app.register(fastifyCors, { origin: 'https://example.com' });
```

Note: File upload handling with Fastify requires `@fastify/multipart` instead of `multer`.
