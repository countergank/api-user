---
priority: P0
category: security
---

# Apply ValidationPipe globally with transform and whitelist

**Do**: Register `ValidationPipe` globally in `main.ts` with `transform: true` and `whitelist: true` to auto-sanitize all incoming request bodies.
**Avoid**: Applying validation pipe per-route or forgetting `whitelist: true`, which allows unexpected properties to pass through.
**Example**:
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true })
  );
  await app.listen(3000);
}
```
