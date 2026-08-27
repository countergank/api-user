---
priority: P1
category: operations
---

# Use ConfigModule with validated environment schemas

**Do**: Import `ConfigModule.forRoot({ isGlobal: true, validate })` with a Joi or Zod schema that validates all required environment variables at startup.
**Avoid**: Accessing `process.env` directly in services or failing fast when required configuration is missing.
**Example**:
```typescript
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
