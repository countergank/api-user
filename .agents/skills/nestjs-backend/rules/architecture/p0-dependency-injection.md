---
priority: P0
category: architecture
---

# Inject dependencies through constructor parameters

**Do**: Declare all dependencies as constructor parameters with `private readonly` or `protected` modifiers for automatic property assignment.
**Avoid**: Using `@Inject()` property decorators, service locators, or manually instantiating dependencies with `new`.
**Exception**: `@Inject(forwardRef(() => Service))` is the only permitted use of `@Inject()`, and only to resolve circular dependencies (see `p3-circular-dependencies.md`).
**Example**:
```typescript
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly config: ConfigService,
  ) {}
}
```
