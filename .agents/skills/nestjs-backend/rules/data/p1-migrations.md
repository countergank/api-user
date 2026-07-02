---
priority: P1
category: data
---

# Use migrations for schema changes, never sync in production

**Do**: Generate and run migrations with `typeorm migration:generate` and `migration:run` for all schema changes, including in CI/CD pipelines.
**Avoid**: Using `synchronize: true` in production TypeORM config, which can drop columns and lose data on application restart.
**Example**:
```typescript
// ormconfig.ts
{
  synchronize: false, // Always false in production
  migrations: ['src/migrations/*.ts'],
  migrationsRun: true, // Auto-run on startup
}
```
