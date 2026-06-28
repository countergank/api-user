---
priority: P0
category: architecture
---

# Register all injectable classes as providers

**Do**: Declare every service, repository, and injectable class in a module's `providers` array so the DI container can resolve it.
**Avoid**: Using `new ServiceClass()` manually or relying on property injection instead of constructor injection.
**Example**:
```typescript
@Module({
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
```
