---
priority: P3
category: architecture
---

# Resolve circular dependencies with forwardRef

**Do**: Break circular references by using `forwardRef(() => Module)` in imports or `@Inject(forwardRef(() => Service))` in constructors.
**Avoid**: Allowing modules to import each other directly, which causes bootstrap failures and tight coupling.
**Example**:
```typescript
@Module({
  imports: [forwardRef(() => OrdersModule)],
  exports: [UsersService],
})
export class UsersModule {}
```
