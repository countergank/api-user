---
priority: P1
category: architecture
---

# Use dynamic modules for runtime configuration

**Do**: Implement `forRoot()` or `forFeature()` static methods that return `DynamicModule` objects when a module needs runtime configuration or async providers.
**Avoid**: Hardcoding configuration values in module imports or using global singletons for configurable services.
**Example**:
```typescript
static forRoot(options: DatabaseOptions): DynamicModule {
  return {
    module: DatabaseModule,
    providers: [{ provide: DB_OPTIONS, useValue: options }],
    exports: [DB_OPTIONS],
  };
}
```
