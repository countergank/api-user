---
priority: P0
category: security
---

# Enable Helmet and configure CORS with explicit origins

**Do**: Use `helmet()` middleware for security headers and configure CORS with an explicit `origin` allowlist, not wildcard `*`.
**Avoid**: Disabling CORS or using `origin: '*'` in production, which exposes the API to cross-origin attacks.
**Example** (Express path):
```typescript
app.use(helmet());
app.enableCors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST'],
  credentials: true,
});
```
**Fastify note**: On Fastify, register `@fastify/helmet` on the Fastify instance instead of Express `helmet()` middleware (e.g., `await app.register(helmet)` plus `app.enableCors(...)`). CORS configuration itself is unchanged.
