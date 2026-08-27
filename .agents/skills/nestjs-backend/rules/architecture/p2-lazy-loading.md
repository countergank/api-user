---
priority: P2
category: architecture
---

# Lazy-load modules for large applications

**Do**: Use `RouterModule.register()` with lazy-loaded module imports to defer loading of feature modules until their routes are accessed.
**Avoid**: Eagerly importing all modules at startup when the application has many features that are rarely used.
**Example**:
```typescript
RouterModule.register([
  {
    path: 'admin',
    module: AdminModule,
    lazy: true,
  },
]);
```
