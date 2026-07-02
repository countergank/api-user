---
priority: P0
category: security
---

# Enable Helmet and configure CORS with explicit origins

**Do**: Use `helmet()` middleware for security headers and configure CORS with an explicit `origin` allowlist, not wildcard `*`.
**Avoid**: Disabling CORS or using `origin: '*'` in production, which exposes the API to cross-origin attacks.
**Example**:
```typescript
app.use(helmet());
app.enableCors({
  origin: ['https://app.example.com'],
  methods: ['GET', 'POST'],
  credentials: true,
});
```
