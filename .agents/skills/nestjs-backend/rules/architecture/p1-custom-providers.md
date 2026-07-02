---
priority: P1
category: architecture
---

# Use custom providers for interface-based injection

**Do**: Define injection tokens with `useClass`, `useFactory`, or `useValue` to enable swapping implementations (e.g., mock services in tests).
**Avoid**: Tight-coupling to concrete classes without abstraction, making testing and environment-specific swaps impossible.
**Example**:
```typescript
{
  provide: UserRepository,
  useClass: process.env.NODE_ENV === 'test'
    ? MockUserRepository
    : PostgresUserRepository,
}
```
